import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

interface EloHistoryEntry {
  playerId: string;
  oldRating: number;
  newRating: number;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

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
      const [eloHistoryData, captainData, teamMembershipData] =
        await Promise.all([
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

      // Process players with pre-fetched data
      players = eventRatings.map((eventRating, currentIndex) => {
        const playerId = eventRating.playerId;

        // Calculate trend from pre-fetched data
        const recentHistory = eloHistoryMap.get(playerId) || [];
        let trend = 0;
        if (recentHistory.length > 0) {
          const totalRatingChange = recentHistory.reduce(
            (total: number, entry: EloHistoryEntry) => {
              return total + (entry.newRating - entry.oldRating);
            },
            0
          );
          trend =
            Math.sign(totalRatingChange) *
            Math.min(Math.abs(totalRatingChange) / 100, 5);
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
      const [eloHistoryData, captainData, teamMembershipData] =
        await Promise.all([
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

      // Process players with pre-fetched data
      players = playersWithAverages.map((player, currentIndex) => {
        const playerId = player.id;

        // Calculate trend from pre-fetched data
        const recentHistory = eloHistoryMap.get(playerId) || [];
        let trend = 0;
        if (recentHistory.length > 0) {
          const totalRatingChange = recentHistory.reduce(
            (total: number, entry: EloHistoryEntry) => {
              return total + (entry.newRating - entry.oldRating);
            },
            0
          );
          trend =
            Math.sign(totalRatingChange) *
            Math.min(Math.abs(totalRatingChange) / 100, 5);
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
          captainedTeams,
          team: teamInfo,
        };
      });
    }

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}
