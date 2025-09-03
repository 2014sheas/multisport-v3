/**
 * Optimized database queries
 * Reusable query patterns for common operations
 */

import { prisma } from "@/lib/prisma";
import { RatingService } from "../services/rating.service";

export class OptimizedQueries {
  private static ratingService = new RatingService();

  /**
   * Get teams with their average ratings - optimized single query
   * Replaces the complex logic in teams/route.ts
   */
  static async getTeamsWithAverageRatings(
    options: {
      includeTrend?: boolean;
      eventId?: string;
      year?: number;
    } = {}
  ) {
    const { includeTrend = false, eventId, year } = options;

    // Single optimized query to get all teams with their data
    const teams = await prisma.team.findMany({
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

    // Process teams using the centralized rating service
    return teams
      .filter((team) => team.members.length > 0)
      .map((team) => {
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

        const memberRatings = members.map((m) => m.rating);
        const averageRating =
          this.ratingService.calculateTeamAverageRating(memberRatings);

        let averageTrend = 0;
        if (includeTrend) {
          const memberTrends = members.map((m) => m.trend || 0);
          averageTrend = Math.round(
            memberTrends.reduce((sum, trend) => sum + trend, 0) /
              memberTrends.length
          );
        }

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
   * Get players with their overall average ratings - optimized for rankings
   * Replaces the complex logic in rankings/route.ts
   */
  static async getPlayersWithOverallRatings(
    options: {
      includeTrend?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { includeTrend = false, limit, offset } = options;

    const players = await prisma.player.findMany({
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
      const rating = this.ratingService.calculatePlayerAverageRating(
        player as any,
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
   * Get team members with their ratings - optimized for team player lists
   * Replaces the complex logic in teams/[abbreviation]/players/route.ts
   */
  static async getTeamMembersWithRatings(
    teamId: string,
    options: {
      includeTrend?: boolean;
      eventId?: string;
    } = {}
  ) {
    const { includeTrend = false, eventId } = options;

    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId },
      select: {
        player: {
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
        },
      },
    });

    return teamMembers.map((member: any) => {
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
        id: player.id,
        name: player.name,
        rating,
        trend,
        experience: player.experience,
      };
    });
  }

  /**
   * Get event teams with their ratings - optimized for event team lists
   * Replaces the complex logic in events/[abbreviation]/teams/route.ts
   */
  static async getEventTeamsWithRatings(
    eventId: string,
    options: {
      includeTrend?: boolean;
    } = {}
  ) {
    const { includeTrend = false } = options;

    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        abbreviation: true,
        color: true,
        logo: true,
        members: {
          select: {
            player: {
              select: {
                id: true,
                name: true,
                eloRating: true,
                eventRatings: {
                  where: { eventId },
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
      },
    });

    return teams
      .filter((team) => team.members.length > 0)
      .map((team) => {
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

        const memberRatings = members.map((m) => m.rating);
        const averageRating =
          this.ratingService.calculateTeamAverageRating(memberRatings);

        let averageTrend = 0;
        if (includeTrend) {
          const memberTrends = members.map((m) => m.trend || 0);
          averageTrend = Math.round(
            memberTrends.reduce((sum, trend) => sum + trend, 0) /
              memberTrends.length
          );
        }

        return {
          id: team.id,
          name: team.name,
          abbreviation: team.abbreviation,
          color: team.color,
          logo: team.logo,
          averageRating,
          ...(includeTrend && { averageTrend }),
          memberCount: members.length,
          members,
        };
      })
      .sort((a, b) => b.averageRating - a.averageRating);
  }

  /**
   * Get standings data with team averages - optimized for standings
   * Replaces the complex logic in standings/route.ts
   */
  static async getStandingsWithTeamAverages() {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        abbreviation: true,
        color: true,
        logo: true,
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
              },
            },
          },
        },
      },
    });

    return teams
      .filter((team) => team.members.length > 0)
      .map((team) => {
        const members = team.members.map((member: any) => {
          const player = member.player;
          const rating = this.ratingService.calculatePlayerAverageRating(
            player as any,
            { useEventRatings: true }
          );

          return {
            playerId: player.id,
            playerName: player.name,
            rating,
          };
        });

        const memberRatings = members.map((m) => m.rating);
        const averageRating =
          this.ratingService.calculateTeamAverageRating(memberRatings);

        return {
          teamId: team.id,
          teamName: team.name,
          teamAbbreviation: team.abbreviation,
          teamColor: team.color,
          teamLogo: team.logo,
          averageRating,
          memberCount: members.length,
          members,
        };
      });
  }
}
