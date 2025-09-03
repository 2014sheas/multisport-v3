/**
 * Team database service
 * Handles all team-related database operations with optimized queries
 */

import { BaseService } from "./base.service";
import { RatingService } from "./rating.service";
import { NotFoundError, ConflictError } from "@/lib/errors";

export interface TeamData {
  name: string;
  captainId?: string;
  color?: string;
  abbreviation?: string;
  logo?: string;
  year?: number;
}

export interface UpdateTeamData {
  name?: string;
  captainId?: string;
  color?: string;
  abbreviation?: string;
  logo?: string;
  year?: number;
}

export interface TeamWithRatings {
  id: string;
  name: string;
  abbreviation?: string;
  color: string;
  logo?: string;
  captainId?: string;
  year?: number;
  averageRating: number;
  averageTrend?: number;
  memberCount: number;
  members: Array<{
    playerId: string;
    playerName: string;
    rating: number;
    trend?: number;
  }>;
  captain?: {
    id: string;
    name: string;
    rating: number;
  };
}

export class TeamService extends BaseService {
  private ratingService: RatingService;

  constructor() {
    super();
    this.ratingService = new RatingService();
  }

  /**
   * Get all teams with their average ratings
   */
  async getTeamsWithRatings(
    options: {
      includeTrend?: boolean;
      eventId?: string;
      year?: number;
    } = {}
  ): Promise<TeamWithRatings[]> {
    const { includeTrend = false, eventId, year } = options;

    const teams = await this.findMany("team", {
      where: year ? { year } : {},
      select: {
        id: true,
        name: true,
        abbreviation: true,
        color: true,
        logo: true,
        captainId: true,
        year: true,
        members: {
          select: {
            player: {
              select: {
                id: true,
                name: true,
                eloRating: true,
                eventRatings: {
                  select: {
                    rating: true,
                    eventId: true,
                  },
                },
                ...(includeTrend && {
                  eloHistory: {
                    select: {
                      oldRating: true,
                      newRating: true,
                      timestamp: true,
                    },
                    orderBy: { timestamp: "desc" },
                    take: 1,
                  },
                }),
              },
            },
          },
        },
        captain: {
          select: {
            id: true,
            name: true,
            eloRating: true,
            eventRatings: {
              select: {
                rating: true,
                eventId: true,
              },
            },
          },
        },
      },
    });

    return teams
      .filter((team: any) => team.members.length > 0)
      .map((team: any) => {
        // Calculate member ratings
        const members = team.members.map((member: any) => {
          const player = member.player;
          const rating = this.ratingService.calculatePlayerAverageRating(
            player as any,
            { useEventRatings: true, eventId }
          );

          let trend = 0;
          if (includeTrend && player.eloHistory?.length > 0) {
            const history = player.eloHistory[0];
            trend = Math.round(history.newRating - history.oldRating);
          }

          return {
            playerId: player.id,
            playerName: player.name,
            rating,
            ...(includeTrend && { trend }),
          };
        });

        // Calculate team average rating
        const memberRatings = members.map((m: any) => m.rating);
        const averageRating =
          this.ratingService.calculateTeamAverageRating(memberRatings);

        // Calculate average trend
        let averageTrend = 0;
        if (includeTrend) {
          const memberTrends = members.map((m: any) => m.trend || 0);
          averageTrend = Math.round(
            memberTrends.reduce(
              (sum: number, trend: number) => sum + trend,
              0
            ) / memberTrends.length
          );
        }

        // Calculate captain rating
        let captain = undefined;
        if (team.captain) {
          const captainRating = this.ratingService.calculatePlayerAverageRating(
            team.captain as any,
            { useEventRatings: true, eventId }
          );
          captain = {
            id: team.captain.id,
            name: team.captain.name,
            rating: captainRating,
          };
        }

        return {
          id: team.id,
          name: team.name,
          abbreviation: team.abbreviation,
          color: team.color,
          logo: team.logo,
          captainId: team.captainId,
          year: team.year,
          averageRating,
          ...(includeTrend && { averageTrend }),
          memberCount: members.length,
          members,
          ...(captain && { captain }),
        };
      })
      .sort((a, b) => b.averageRating - a.averageRating);
  }

  /**
   * Get team by ID with ratings
   */
  async getTeamByIdWithRatings(
    id: string,
    options: {
      includeTrend?: boolean;
      eventId?: string;
    } = {}
  ): Promise<TeamWithRatings | null> {
    const teams = await this.getTeamsWithRatings(options);
    return teams.find((team) => team.id === id) || null;
  }

  /**
   * Get team by abbreviation with ratings
   */
  async getTeamByAbbreviationWithRatings(
    abbreviation: string,
    options: {
      includeTrend?: boolean;
      eventId?: string;
      year?: number;
    } = {}
  ): Promise<TeamWithRatings | null> {
    const teams = await this.getTeamsWithRatings(options);
    return teams.find((team) => team.abbreviation === abbreviation) || null;
  }

  /**
   * Get teams for a specific event
   */
  async getTeamsForEvent(
    eventId: string,
    options: {
      includeTrend?: boolean;
    } = {}
  ): Promise<TeamWithRatings[]> {
    return this.getTeamsWithRatings({
      ...options,
      eventId,
    });
  }

  /**
   * Create a new team
   */
  async createTeam(data: TeamData) {
    // Check if team with same name already exists in the same year
    const existingTeam = await this.findMany("team", {
      where: {
        name: data.name,
        year: data.year || new Date().getFullYear(),
      },
      take: 1,
    });

    if (existingTeam.length > 0) {
      throw new ConflictError(
        `Team with name "${data.name}" already exists for this year`
      );
    }

    return this.create("team", {
      ...data,
      color: data.color || "#3B82F6",
      year: data.year || new Date().getFullYear(),
    });
  }

  /**
   * Update a team
   */
  async updateTeam(id: string, data: UpdateTeamData) {
    // Check if team exists
    const existingTeam = await this.findById("team", id);
    if (!existingTeam) {
      throw new NotFoundError("Team");
    }

    // If updating name, check for conflicts
    if (data.name) {
      const conflictingTeam = await this.findMany("team", {
        where: {
          name: data.name,
          year: data.year || (existingTeam as any).year,
          id: { not: id },
        },
        take: 1,
      });

      if (conflictingTeam.length > 0) {
        throw new ConflictError(
          `Team with name "${data.name}" already exists for this year`
        );
      }
    }

    return this.updateById("team", id, data);
  }

  /**
   * Delete a team
   */
  async deleteTeam(id: string) {
    const team = await this.findById("team", id);
    if (!team) {
      throw new NotFoundError("Team");
    }

    // Check if team has associated data
    const [membersCount, gamesCount] = await this.parallel([
      () => this.count("teamMember", { teamId: id }),
      () =>
        this.count("game", {
          OR: [{ team1Id: id }, { team2Id: id }],
        }),
    ]);

    if (membersCount > 0 || gamesCount > 0) {
      throw new ConflictError(
        "Cannot delete team - it has members or is involved in games"
      );
    }

    await this.deleteById("team", id);
    return { message: "Team deleted successfully" };
  }

  /**
   * Add player to team
   */
  async addPlayerToTeam(
    teamId: string,
    playerId: string,
    year?: number
  ): Promise<void> {
    // Check if team exists
    await this.getTeamByIdWithRatings(teamId);

    // Check if player is already on team
    const existingMembership = await this.exists("teamMember", {
      teamId,
      playerId,
      year: year || new Date().getFullYear(),
    });

    if (existingMembership) {
      throw new ConflictError("Player is already on this team");
    }

    await this.create("teamMember", {
      teamId,
      playerId,
      year: year || new Date().getFullYear(),
    });
  }

  /**
   * Remove player from team
   */
  async removePlayerFromTeam(
    teamId: string,
    playerId: string,
    year?: number
  ): Promise<void> {
    const membership = await this.findMany("teamMember", {
      where: {
        teamId,
        playerId,
        year: year || new Date().getFullYear(),
      },
      take: 1,
    });

    if (membership.length === 0) {
      throw new NotFoundError("Team membership");
    }

    await this.deleteById("teamMember", (membership[0] as any).id);
  }

  /**
   * Get team statistics
   */
  async getTeamStats(teamId: string) {
    const [team, membersCount, gamesCount, winsCount, lossesCount] =
      await this.parallel([
        () => this.getTeamByIdWithRatings(teamId),
        () => this.count("teamMember", { teamId }),
        () =>
          this.count("game", {
            OR: [{ team1Id: teamId }, { team2Id: teamId }],
            status: "COMPLETED",
          }),
        () =>
          this.count("game", {
            OR: [
              { team1Id: teamId, team1Score: { gt: 0 } },
              { team2Id: teamId, team2Score: { gt: 0 } },
            ],
            status: "COMPLETED",
          }),
        () =>
          this.count("game", {
            OR: [
              { team1Id: teamId, team1Score: { lt: 0 } },
              { team2Id: teamId, team2Score: { lt: 0 } },
            ],
            status: "COMPLETED",
          }),
      ]);

    if (!team) {
      throw new NotFoundError("Team");
    }

    return {
      team,
      stats: {
        members: membersCount,
        games: gamesCount,
        wins: winsCount,
        losses: lossesCount,
        winRate: gamesCount > 0 ? (winsCount / gamesCount) * 100 : 0,
      },
    };
  }
}
