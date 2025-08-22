import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// This API calculates 24h trends using NET rating change (final - initial)
// rather than summing all individual changes. This prevents inflated numbers
// from multiple eloHistory entries created per vote.

interface EloHistoryEntry {
  playerId: string;
  oldRating: number;
  newRating: number;
  timestamp: Date;
}

interface CaptainData {
  id: string;
  name: string;
  captainId: string | null;
}

interface TeamMembershipData {
  playerId: string;
  teamId: string;
}

interface TeamData {
  id: string;
  name: string;
  color: string;
  abbreviation: string | null;
}

interface PlayerRanking {
  id: string;
  name: string;
  eloRating: number;
  experience: number;
  rank: number;
  trend: number;
  captainedTeams: Array<{ id: string; name: string }>;
  team: {
    id: string;
    name: string;
    color: string;
    abbreviation: string | null;
  } | null;
  eventId?: string;
  eventName?: string;
  eventAbbreviation?: string;
  gamesPlayed?: number;
}

interface MaterializedViewPlayer {
  id: string;
  name: string;
  experience: bigint;
  eloRating: bigint;
  elo_rating: bigint;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
  team_abbreviation: string | null;
  is_captain: boolean;
  event_count: bigint;
  events_participated: bigint;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const useFastPath = searchParams.get("fast") === "true";

    // Ultra-fast path using materialized view (recommended for production)
    if (useFastPath) {
      console.log("🚀 Using ultra-fast materialized view path");

      const startTime = Date.now();

      // Single query to get all rankings data
      const rankingsData = await prisma.$queryRaw<MaterializedViewPlayer[]>`
        SELECT 
          id,
          name,
          experience,
          "eloRating",
          "avg_event_rating" as elo_rating,
          "team_id",
          "team_name",
          "team_color",
          "team_abbreviation",
          "is_captain",
          "event_count",
          "events_participated"
        FROM player_rankings_mv
        ORDER BY "avg_event_rating" DESC, "eloRating" DESC
      `;

      // Fetch profile pictures for all players
      const playerIds = rankingsData.map((player) => player.id);
      const userProfilePictures = await prisma.user.findMany({
        where: {
          playerId: { in: playerIds },
        },
        select: {
          playerId: true,
          image: true,
        },
      });

      // Create a map for quick lookup
      const profilePictureMap = new Map<string, string | null>();
      userProfilePictures.forEach((user) => {
        if (user.playerId) {
          profilePictureMap.set(user.playerId, user.image);
        }
      });

      // Process the data into the expected format
      const players = rankingsData.map(
        (player: MaterializedViewPlayer, index: number) => ({
          id: player.id,
          name: player.name,
          eloRating: Number(player.elo_rating || player.eloRating),
          experience: Number(player.experience || 0),
          rank: index + 1,
          trend: 0, // Materialized view doesn't include trend, would need separate calculation
          profilePicture: profilePictureMap.get(player.id) || null,
          captainedTeams: player.is_captain
            ? [{ id: player.team_id, name: player.team_name }]
            : [],
          team: player.team_id
            ? {
                id: player.team_id,
                name: player.team_name,
                color: player.team_color,
                abbreviation: player.team_abbreviation,
              }
            : null,
          gamesPlayed: Number(player.event_count || 0),
        })
      );

      const queryTime = Date.now() - startTime;
      console.log(`⚡ Materialized view query completed in ${queryTime}ms`);

      return NextResponse.json({
        players,
        performance: {
          method: "materialized_view",
          queryTime: `${queryTime}ms`,
          optimization: "ultra_fast",
        },
      });
    }

    // Original optimized path (fallback)
    let players: PlayerRanking[] = [];

    if (eventId) {
      // Get event-specific rankings with optimized batch queries
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Fetch all event ratings with player data in one query
      const eventRatings = await prisma.eventRating.findMany({
        where: {
          eventId: eventId,
        },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              experience: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            },
          },
        },
        orderBy: {
          rating: "desc",
        },
      });

      // Get all player IDs for batch queries
      const playerIds = eventRatings.map((er) => er.playerId);

      // Batch fetch all related data
      const [
        eloHistoryData,
        captainData,
        teamMembershipData,
        userProfilePictures,
      ] = await Promise.all([
        // Fetch all Elo history for these players in one query
        prisma.eloHistory.findMany({
          where: {
            playerId: { in: playerIds },
            eventId: eventId,
            timestamp: { gte: twentyFourHoursAgo },
          },
          select: {
            playerId: true,
            oldRating: true,
            newRating: true,
            timestamp: true,
          },
        }),
        // Fetch all captain data in one query
        prisma.team.findMany({
          where: {
            captainId: { in: playerIds },
          },
          select: {
            id: true,
            name: true,
            captainId: true,
          },
        }),
        // Fetch all team memberships in one query
        prisma.teamMember.findMany({
          where: {
            playerId: { in: playerIds },
          },
          select: {
            playerId: true,
            teamId: true,
          },
        }),
        // Fetch profile pictures for all players
        prisma.user.findMany({
          where: {
            playerId: { in: playerIds },
          },
          select: {
            playerId: true,
            image: true,
          },
        }),
      ]);

      // Fetch team data separately since it depends on teamMembershipData
      const teamIds = teamMembershipData.map(
        (tm: TeamMembershipData) => tm.teamId
      );
      const teamData = await prisma.team.findMany({
        where: {
          id: { in: teamIds },
        },
        select: {
          id: true,
          name: true,
          color: true,
          abbreviation: true,
        },
      });

      // Create lookup maps for O(1) access
      const eloHistoryMap = new Map<string, EloHistoryEntry[]>();
      eloHistoryData.forEach((entry: EloHistoryEntry) => {
        if (!eloHistoryMap.has(entry.playerId)) {
          eloHistoryMap.set(entry.playerId, []);
        }
        eloHistoryMap.get(entry.playerId)!.push(entry);
      });

      const captainMap = new Map<string, CaptainData>();
      captainData.forEach((team: CaptainData) => {
        if (team.captainId) {
          captainMap.set(team.captainId, team);
        }
      });

      const teamMembershipMap = new Map<string, string>();
      teamMembershipData.forEach((member: TeamMembershipData) => {
        teamMembershipMap.set(member.playerId, member.teamId);
      });

      const teamMap = new Map<string, TeamData>();
      teamData.forEach((team: TeamData) => {
        teamMap.set(team.id, team);
      });

      // Create profile picture lookup map
      const profilePictureMap = new Map<string, string | null>();
      userProfilePictures.forEach((user) => {
        if (user.playerId) {
          profilePictureMap.set(user.playerId, user.image);
        }
      });

      // Process players with pre-fetched data
      players = eventRatings.map((eventRating, currentIndex) => {
        const playerId = eventRating.playerId;

        // Calculate trend from pre-fetched data - show net rating change over 24h
        const recentHistory = eloHistoryMap.get(playerId) || [];
        let trend = 0;

        if (recentHistory.length > 0) {
          // Calculate net change: (final rating - initial rating) over 24h
          // This prevents inflated numbers from multiple eloHistory entries per vote
          const sortedHistory = recentHistory.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          if (sortedHistory.length > 0) {
            const initialRating = sortedHistory[0].oldRating;
            const finalRating =
              sortedHistory[sortedHistory.length - 1].newRating;
            trend = Math.round(finalRating - initialRating);
          }
        }

        // Get captain status from pre-fetched data
        const captainedTeams = captainMap.has(playerId)
          ? [
              {
                id: captainMap.get(playerId)!.id,
                name: captainMap.get(playerId)!.name,
              },
            ]
          : [];

        // Get team info from pre-fetched data
        const teamMembership = teamMembershipMap.get(playerId);
        const teamInfo = teamMembership
          ? teamMap.get(teamMembership) || null
          : null;

        return {
          id: eventRating.player.id,
          name: eventRating.player.name,
          eloRating: eventRating.rating,
          experience: eventRating.player.experience || 0,
          rank: currentIndex + 1,
          trend: Math.round(trend),
          profilePicture: profilePictureMap.get(playerId) || null,
          captainedTeams,
          team: teamInfo,
          eventId: eventRating.event.id,
          eventName: eventRating.event.name,
          eventAbbreviation: eventRating.event.abbreviation,
          gamesPlayed: eventRating.gamesPlayed,
        };
      });
    } else {
      // Get overall rankings with optimized batch queries
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Fetch all players with their event ratings in one query
      const playersWithEventRatings = await prisma.player.findMany({
        select: {
          id: true,
          name: true,
          experience: true,
          eventRatings: {
            select: {
              rating: true,
            },
          },
        },
      });

      // Calculate average ratings and sort by them
      const playersWithAverages = playersWithEventRatings
        .map((player) => {
          let overallRating = 5000; // Default rating if no event ratings exist
          if (player.eventRatings.length > 0) {
            const totalRating = player.eventRatings.reduce(
              (sum, er) => sum + er.rating,
              0
            );
            overallRating = Math.round(
              totalRating / player.eventRatings.length
            );
          }
          return {
            ...player,
            eloRating: overallRating,
          };
        })
        .sort((a, b) => b.eloRating - a.eloRating);

      // Get all player IDs for batch queries
      const playerIds = playersWithAverages.map((p) => p.id);

      // Batch fetch all related data
      const [
        eloHistoryData,
        captainData,
        teamMembershipData,
        userProfilePictures,
      ] = await Promise.all([
        // Fetch all Elo history for these players in one query
        prisma.eloHistory.findMany({
          where: {
            playerId: { in: playerIds },
            timestamp: { gte: twentyFourHoursAgo },
          },
          select: {
            playerId: true,
            oldRating: true,
            newRating: true,
            timestamp: true,
          },
        }),
        // Fetch all captain data in one query
        prisma.team.findMany({
          where: {
            captainId: { in: playerIds },
          },
          select: {
            id: true,
            name: true,
            captainId: true,
          },
        }),
        // Fetch all team memberships in one query
        prisma.teamMember.findMany({
          where: {
            playerId: { in: playerIds },
          },
          select: {
            playerId: true,
            teamId: true,
          },
        }),
        // Fetch profile pictures for all players
        prisma.user.findMany({
          where: {
            playerId: { in: playerIds },
          },
          select: {
            playerId: true,
            image: true,
          },
        }),
      ]);

      // Fetch team data separately since it depends on teamMembershipData
      const teamIds = teamMembershipData.map(
        (tm: TeamMembershipData) => tm.teamId
      );
      const teamData = await prisma.team.findMany({
        where: {
          id: { in: teamIds },
        },
        select: {
          id: true,
          name: true,
          color: true,
          abbreviation: true,
        },
      });

      // Create lookup maps for O(1) access
      const eloHistoryMap = new Map<string, EloHistoryEntry[]>();
      eloHistoryData.forEach((entry: EloHistoryEntry) => {
        if (!eloHistoryMap.has(entry.playerId)) {
          eloHistoryMap.set(entry.playerId, []);
        }
        eloHistoryMap.get(entry.playerId)!.push(entry);
      });

      const captainMap = new Map<string, CaptainData>();
      captainData.forEach((team: CaptainData) => {
        if (team.captainId) {
          captainMap.set(team.captainId, team);
        }
      });

      const teamMembershipMap = new Map<string, string>();
      teamMembershipData.forEach((member: TeamMembershipData) => {
        teamMembershipMap.set(member.playerId, member.teamId);
      });

      const teamMap = new Map<string, TeamData>();
      teamData.forEach((team: TeamData) => {
        teamMap.set(team.id, team);
      });

      // Create profile picture lookup map
      const profilePictureMap = new Map<string, string | null>();
      userProfilePictures.forEach((user) => {
        if (user.playerId) {
          profilePictureMap.set(user.playerId, user.image);
        }
      });

      // Process players with pre-fetched data
      players = playersWithAverages.map((player, currentIndex) => {
        const playerId = player.id;

        // Calculate trend from pre-fetched data - show net rating change over 24h
        const recentHistory = eloHistoryMap.get(playerId) || [];
        let trend = 0;

        if (recentHistory.length > 0) {
          // Calculate net change: (final rating - initial rating) over 24h
          // This prevents inflated numbers from multiple eloHistory entries per vote
          const sortedHistory = recentHistory.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          if (sortedHistory.length > 0) {
            const initialRating = sortedHistory[0].oldRating;
            const finalRating =
              sortedHistory[sortedHistory.length - 1].newRating;
            // Since we're calculating overall rating as average of event ratings,
            // we need to divide the trend by the total number of events to get
            // the proper overall trend
            const totalEvents = player.eventRatings.length;
            const rawTrend = finalRating - initialRating;
            trend = totalEvents > 0 ? Math.round(rawTrend / totalEvents) : 0;
          }
        }

        // Get captain status from pre-fetched data
        const captainedTeams = captainMap.has(playerId)
          ? [
              {
                id: captainMap.get(playerId)!.id,
                name: captainMap.get(playerId)!.name,
              },
            ]
          : [];

        // Get team info from pre-fetched data
        const teamMembership = teamMembershipMap.get(playerId);
        const teamInfo = teamMembership
          ? teamMap.get(teamMembership) || null
          : null;

        return {
          id: player.id,
          name: player.name,
          eloRating: player.eloRating,
          experience: player.experience || 0,
          rank: currentIndex + 1,
          trend: Math.round(trend),
          profilePicture: profilePictureMap.get(playerId) || null,
          captainedTeams,
          team: teamInfo,
        };
      });
    }

    return NextResponse.json({
      players,
      performance: {
        method: "optimized_batch_queries",
        optimization: "high_performance",
      },
    });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}
