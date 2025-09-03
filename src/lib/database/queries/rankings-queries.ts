/**
 * Optimized rankings queries
 * Centralizes the complex ranking logic from rankings/route.ts
 */

import { prisma } from "@/lib/prisma";
import { RatingService, UserService, TeamMembershipService } from "../services";

export interface RankingPlayer {
  id: string;
  name: string;
  eloRating: number;
  experience: number;
  rank: number;
  trend: number;
  profilePicture: string | null;
  captainedTeams: Array<{
    id: string;
    name: string;
  }>;
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

export interface MaterializedViewPlayer {
  id: string;
  name: string;
  experience: number;
  eloRating: number;
  elo_rating: number;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
  team_abbreviation: string | null;
  team_logo: string | null;
  is_captain: boolean;
  event_count: bigint;
  events_participated: bigint;
}

export class RankingsQueries {
  private static ratingService = new RatingService();
  private static userService = new UserService();
  private static teamMembershipService = new TeamMembershipService();

  /**
   * Get rankings using materialized view (ultra-fast path)
   */
  static async getRankingsFromMaterializedView(): Promise<RankingPlayer[]> {
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
        "team_logo",
        "is_captain",
        "event_count",
        "events_participated"
      FROM player_rankings_mv
      ORDER BY "avg_event_rating" DESC, "eloRating" DESC
    `;

    // Get profile pictures for all players
    const playerIds = rankingsData.map((player) => player.id);
    const profilePictureMap = await this.userService.getPlayerProfilePictures(
      playerIds
    );

    // Process the data into the expected format
    const players: RankingPlayer[] = rankingsData.map((player, index) => ({
      id: player.id,
      name: player.name,
      eloRating: Number(player.elo_rating),
      experience: player.experience,
      rank: index + 1,
      trend: 0, // Materialized view doesn't include trend data
      profilePicture: profilePictureMap.get(player.id) || null,
      captainedTeams:
        player.is_captain && player.team_id
          ? [
              {
                id: player.team_id,
                name: player.team_name || "Unknown Team",
              },
            ]
          : [],
      team: player.team_id
        ? {
            id: player.team_id,
            name: player.team_name || "Unknown Team",
            color: player.team_color || "#3B82F6",
            abbreviation: player.team_abbreviation,
          }
        : null,
      gamesPlayed: Number(player.events_participated),
    }));

    return players;
  }

  /**
   * Get overall rankings with optimized batch queries
   */
  static async getOverallRankings(): Promise<RankingPlayer[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeYear = new Date().getFullYear();

    // Get all players with their overall ratings
    const playersWithRatings =
      await this.ratingService.getPlayersWithOverallRatings({
        includeTrend: true,
      });

    // Get all player IDs for batch queries
    const playerIds = playersWithRatings.map((p) => p.id);

    // Batch fetch all related data
    const [eloHistoryData, captainData, teamMembershipData] = await Promise.all(
      [
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
            year: activeYear,
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
            year: activeYear,
          },
          select: {
            playerId: true,
            teamId: true,
          },
        }),
      ]
    );

    // Fetch team data separately since it depends on teamMembershipData
    const teamIds = teamMembershipData.map((tm: any) => tm.teamId);
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

    // Get profile pictures
    const profilePictureMap = await this.userService.getPlayerProfilePictures(
      playerIds
    );

    // Create lookup maps for O(1) access
    const eloHistoryMap = new Map<string, any[]>();
    eloHistoryData.forEach((entry: any) => {
      if (!eloHistoryMap.has(entry.playerId)) {
        eloHistoryMap.set(entry.playerId, []);
      }
      eloHistoryMap.get(entry.playerId)!.push(entry);
    });

    const captainMap = new Map<string, any[]>();
    captainData.forEach((team: any) => {
      if (!captainMap.has(team.captainId)) {
        captainMap.set(team.captainId, []);
      }
      captainMap.get(team.captainId)!.push(team);
    });

    const teamMembershipMap = new Map<string, string[]>();
    teamMembershipData.forEach((tm: any) => {
      if (!teamMembershipMap.has(tm.playerId)) {
        teamMembershipMap.set(tm.playerId, []);
      }
      teamMembershipMap.get(tm.playerId)!.push(tm.teamId);
    });

    const teamMap = new Map<string, any>();
    teamData.forEach((team: any) => {
      teamMap.set(team.id, team);
    });

    // Process players with pre-fetched data
    const players: RankingPlayer[] = playersWithRatings.map(
      (player, currentIndex) => {
        // Calculate trend from elo history
        let trend = 0;
        const history = eloHistoryMap.get(player.id) || [];
        if (history.length > 0) {
          const initialRating = history[0].oldRating;
          const finalRating = history[history.length - 1].newRating;
          trend = Math.round(finalRating - initialRating);
        }

        // Get captain teams
        const captainedTeams = captainMap.get(player.id) || [];

        // Get current team
        const teamMembership = teamMembershipMap.get(player.id) || [];
        const teamInfo =
          teamMembership.length > 0
            ? teamMap.get(teamMembership[0]) || null
            : null;

        return {
          id: player.id,
          name: player.name,
          eloRating: player.rating,
          experience: player.experience || 0,
          rank: currentIndex + 1,
          trend: Math.round(trend),
          profilePicture: profilePictureMap.get(player.id) || null,
          captainedTeams: captainedTeams.map((team: any) => ({
            id: team.id,
            name: team.name,
          })),
          team: teamInfo
            ? {
                id: teamInfo.id,
                name: teamInfo.name,
                color: teamInfo.color,
                abbreviation: teamInfo.abbreviation,
              }
            : null,
        };
      }
    );

    return players;
  }

  /**
   * Get event-specific rankings
   */
  static async getEventRankings(eventId: string): Promise<RankingPlayer[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeYear = new Date().getFullYear();

    // Get event ratings for the specific event
    const eventRatings = await prisma.eventRating.findMany({
      where: { eventId },
      select: {
        playerId: true,
        rating: true,
        gamesPlayed: true,
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
      orderBy: { rating: "desc" },
    });

    if (eventRatings.length === 0) {
      return [];
    }

    const playerIds = eventRatings.map((er) => er.playerId);

    // Batch fetch all related data
    const [eloHistoryData, captainData, teamMembershipData] = await Promise.all(
      [
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
            year: activeYear,
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
            year: activeYear,
          },
          select: {
            playerId: true,
            teamId: true,
          },
        }),
      ]
    );

    // Fetch team data separately since it depends on teamMembershipData
    const teamIds = teamMembershipData.map((tm: any) => tm.teamId);
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

    // Get profile pictures
    const profilePictureMap = await this.userService.getPlayerProfilePictures(
      playerIds
    );

    // Create lookup maps for O(1) access
    const eloHistoryMap = new Map<string, any[]>();
    eloHistoryData.forEach((entry: any) => {
      if (!eloHistoryMap.has(entry.playerId)) {
        eloHistoryMap.set(entry.playerId, []);
      }
      eloHistoryMap.get(entry.playerId)!.push(entry);
    });

    const captainMap = new Map<string, any[]>();
    captainData.forEach((team: any) => {
      if (!captainMap.has(team.captainId)) {
        captainMap.set(team.captainId, []);
      }
      captainMap.get(team.captainId)!.push(team);
    });

    const teamMembershipMap = new Map<string, string[]>();
    teamMembershipData.forEach((tm: any) => {
      if (!teamMembershipMap.has(tm.playerId)) {
        teamMembershipMap.set(tm.playerId, []);
      }
      teamMembershipMap.get(tm.playerId)!.push(tm.teamId);
    });

    const teamMap = new Map<string, any>();
    teamData.forEach((team: any) => {
      teamMap.set(team.id, team);
    });

    // Process players with pre-fetched data
    const players: RankingPlayer[] = eventRatings.map(
      (eventRating, currentIndex) => {
        const playerId = eventRating.playerId;

        // Calculate trend from elo history
        let trend = 0;
        const history = eloHistoryMap.get(playerId) || [];
        if (history.length > 0) {
          const initialRating = history[0].oldRating;
          const finalRating = history[history.length - 1].newRating;
          trend = Math.round(finalRating - initialRating);
        }

        // Get captain teams
        const captainedTeams = captainMap.get(playerId) || [];

        // Get current team
        const teamMembership = teamMembershipMap.get(playerId) || [];
        const teamInfo =
          teamMembership.length > 0
            ? teamMap.get(teamMembership[0]) || null
            : null;

        return {
          id: eventRating.player.id,
          name: eventRating.player.name,
          eloRating: eventRating.rating,
          experience: eventRating.player.experience || 0,
          rank: currentIndex + 1,
          trend: Math.round(trend),
          profilePicture: profilePictureMap.get(playerId) || null,
          captainedTeams: captainedTeams.map((team: any) => ({
            id: team.id,
            name: team.name,
          })),
          team: teamInfo
            ? {
                id: teamInfo.id,
                name: teamInfo.name,
                color: teamInfo.color,
                abbreviation: teamInfo.abbreviation,
              }
            : null,
          eventId: eventRating.event.id,
          eventName: eventRating.event.name,
          eventAbbreviation: eventRating.event.abbreviation,
          gamesPlayed: eventRating.gamesPlayed,
        };
      }
    );

    return players;
  }
}
