/**
 * Rating calculation service
 * Centralizes all rating-related calculations and queries
 */

import { BaseService } from "./base.service";
import { calculateTeamAverageRating } from "@/lib/elo-utils";

export interface PlayerRatingData {
  id: string;
  name: string;
  eloRating: number;
  eventRatings: Array<{
    rating: number;
    eventId: string;
  }>;
}

export interface TeamRatingData {
  teamId: string;
  teamName: string;
  members: Array<{
    playerId: string;
    playerName: string;
    rating: number;
    trend?: number;
  }>;
  averageRating: number;
  averageTrend?: number;
}

export interface RatingCalculationOptions {
  includeTrend?: boolean;
  eventId?: string;
  useEventRatings?: boolean;
}

export class RatingService extends BaseService {
  /**
   * Calculate player's average event rating
   */
  calculatePlayerAverageRating(
    player: PlayerRatingData,
    options: RatingCalculationOptions = {}
  ): number {
    const { useEventRatings = true, eventId } = options;

    if (useEventRatings && player.eventRatings.length > 0) {
      const relevantRatings = eventId
        ? player.eventRatings.filter((er) => er.eventId === eventId)
        : player.eventRatings;

      if (relevantRatings.length > 0) {
        const totalRating = relevantRatings.reduce(
          (sum, er) => sum + er.rating,
          0
        );
        return Math.round(totalRating / relevantRatings.length);
      }
    }

    return player.eloRating;
  }

  /**
   * Calculate team's average rating from member ratings
   */
  calculateTeamAverageRating(
    memberRatings: number[],
    fallbackRating: number = 5000
  ): number {
    if (memberRatings.length === 0) return fallbackRating;
    return calculateTeamAverageRating(memberRatings);
  }

  /**
   * Get players with their calculated average ratings
   */
  async getPlayersWithAverageRatings(
    playerIds: string[],
    options: RatingCalculationOptions = {}
  ): Promise<Array<{ id: string; name: string; rating: number }>> {
    const players = await this.findMany("player", {
      where: { id: { in: playerIds } },
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
    });

    return players.map((player: any) => ({
      id: player.id,
      name: player.name,
      rating: this.calculatePlayerAverageRating(
        player as PlayerRatingData,
        options
      ),
    }));
  }

  /**
   * Get team with calculated average rating and member ratings
   */
  async getTeamWithAverageRating(
    teamId: string,
    options: RatingCalculationOptions = {}
  ): Promise<TeamRatingData | null> {
    const team = await this.findMany("team", {
      where: { id: teamId },
      select: {
        id: true,
        name: true,
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
                ...(options.includeTrend && {
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
      },
    });

    if (!team[0] || (team[0] as any).members.length === 0) {
      return null;
    }

    const teamData = team[0] as any;
    const members = teamData.members.map((member: any) => {
      const player = member.player;
      const rating = this.calculatePlayerAverageRating(
        player as PlayerRatingData,
        options
      );

      let trend = 0;
      if (options.includeTrend && player.eloHistory?.length > 0) {
        const history = player.eloHistory[0];
        trend = Math.round(history.newRating - history.oldRating);
      }

      return {
        playerId: player.id,
        playerName: player.name,
        rating,
        ...(options.includeTrend && { trend }),
      };
    });

    const memberRatings = members.map((m: any) => m.rating);
    const averageRating = this.calculateTeamAverageRating(memberRatings);

    let averageTrend = 0;
    if (options.includeTrend) {
      const memberTrends = members.map((m: any) => m.trend || 0);
      averageTrend = Math.round(
        memberTrends.reduce((sum: number, trend: number) => sum + trend, 0) /
          memberTrends.length
      );
    }

    return {
      teamId: teamData.id,
      teamName: teamData.name,
      members,
      averageRating,
      ...(options.includeTrend && { averageTrend }),
    };
  }

  /**
   * Get multiple teams with their average ratings (optimized batch query)
   */
  async getTeamsWithAverageRatings(
    teamIds: string[],
    options: RatingCalculationOptions = {}
  ): Promise<TeamRatingData[]> {
    const teams = await this.findMany("team", {
      where: { id: { in: teamIds } },
      select: {
        id: true,
        name: true,
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
                ...(options.includeTrend && {
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
      },
    });

    return teams
      .filter((team: any) => team.members.length > 0)
      .map((team: any) => {
        const members = team.members.map((member: any) => {
          const player = member.player;
          const rating = this.calculatePlayerAverageRating(
            player as PlayerRatingData,
            options
          );

          let trend = 0;
          if (options.includeTrend && player.eloHistory?.length > 0) {
            const history = player.eloHistory[0];
            trend = Math.round(history.newRating - history.oldRating);
          }

          return {
            playerId: player.id,
            playerName: player.name,
            rating,
            ...(options.includeTrend && { trend }),
          };
        });

        const memberRatings = members.map((m: any) => m.rating);
        const averageRating = this.calculateTeamAverageRating(memberRatings);

        let averageTrend = 0;
        if (options.includeTrend) {
          const memberTrends = members.map((m: any) => m.trend || 0);
          averageTrend = Math.round(
            memberTrends.reduce(
              (sum: number, trend: number) => sum + trend,
              0
            ) / memberTrends.length
          );
        }

        return {
          teamId: team.id,
          teamName: team.name,
          members,
          averageRating,
          ...(options.includeTrend && { averageTrend }),
        };
      });
  }

  /**
   * Get all teams with their average ratings (for standings, rankings, etc.)
   */
  async getAllTeamsWithAverageRatings(
    options: RatingCalculationOptions = {}
  ): Promise<TeamRatingData[]> {
    const teams = await this.findMany("team", {
      select: {
        id: true,
        name: true,
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
                ...(options.includeTrend && {
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
      },
    });

    return this.getTeamsWithAverageRatings(
      teams.map((t: any) => t.id),
      options
    );
  }

  /**
   * Get players with their overall average ratings (for rankings)
   */
  async getPlayersWithOverallRatings(
    options: {
      includeTrend?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<
    Array<{
      id: string;
      name: string;
      rating: number;
      trend?: number;
      experience?: number;
    }>
  > {
    const { includeTrend = false, limit, offset } = options;

    const players = await this.findMany("player", {
      select: {
        id: true,
        name: true,
        eloRating: true,
        experience: true,
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
      ...(limit && { take: limit }),
      ...(offset && { skip: offset }),
    });

    return players.map((player: any) => {
      const rating = this.calculatePlayerAverageRating(
        player as PlayerRatingData,
        { useEventRatings: true }
      );

      let trend = 0;
      if (includeTrend && player.eloHistory?.length > 0) {
        const history = player.eloHistory[0];
        trend = Math.round(history.newRating - history.oldRating);
      }

      return {
        id: player.id,
        name: player.name,
        rating,
        experience: player.experience,
        ...(includeTrend && { trend }),
      };
    });
  }

  /**
   * Calculate 24-hour trend for a player
   */
  calculatePlayerTrend(playerId: string, hours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.findMany("eloHistory", {
      where: {
        playerId,
        timestamp: { gte: cutoffTime },
      },
      select: {
        oldRating: true,
        newRating: true,
        timestamp: true,
      },
      orderBy: { timestamp: "asc" },
    }).then((history: any) => {
      if (history.length === 0) return 0;

      const initialRating = history[0].oldRating;
      const finalRating = history[history.length - 1].newRating;
      return Math.round(finalRating - initialRating);
    });
  }
}
