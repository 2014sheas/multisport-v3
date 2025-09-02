/**
 * Player database service
 * Handles all player-related database operations with optimized queries
 */

import { BaseService } from "./base.service";
import { NotFoundError, ConflictError } from "@/lib/errors";

export interface PlayerData {
  name: string;
  eloRating?: number;
  experience?: number;
  wins?: number;
  isActive?: boolean;
}

export interface UpdatePlayerData {
  name?: string;
  eloRating?: number;
  experience?: number;
  wins?: number;
  isActive?: boolean;
}

export interface PlayerWithStats {
  id: string;
  name: string;
  eloRating: number;
  experience?: number;
  wins?: number;
  isActive: boolean;
  gamesPlayed: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  teamMembers?: Array<{
    team: {
      id: string;
      name: string;
      color: string;
      abbreviation?: string;
    };
  }>;
  eventRatings?: Array<{
    rating: number;
  }>;
}

export class PlayerService extends BaseService {
  /**
   * Get all players with pagination and filtering
   */
  async getPlayers(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      includeUser?: boolean;
      includeTeams?: boolean;
      includeEventRatings?: boolean;
    } = {}
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = "name",
      sortOrder = "asc",
      includeUser = false,
      includeTeams = false,
      includeEventRatings = false,
    } = options;

    const offset = (page - 1) * limit;

    // Build where clause for search
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            ...(includeUser
              ? [
                  {
                    user: {
                      email: { contains: search, mode: "insensitive" as const },
                    },
                  },
                ]
              : []),
          ],
        }
      : {};

    // Build select/include clause
    const select = {
      id: true,
      name: true,
      eloRating: true,
      experience: true,
      wins: true,
      isActive: true,
      gamesPlayed: true,
      createdAt: true,
      updatedAt: true,
      ...(includeUser && {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      }),
      ...(includeTeams && {
        teamMembers: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                color: true,
                abbreviation: true,
              },
            },
          },
          take: 1,
          orderBy: { joinedAt: "desc" },
        },
      }),
      ...(includeEventRatings && {
        eventRatings: {
          select: {
            rating: true,
          },
        },
      }),
    };

    const [players, totalCount] = await this.parallel([
      () =>
        this.findMany("player", {
          where,
          select,
          orderBy: { [sortBy]: sortOrder },
          skip: offset,
          take: limit,
        }),
      () => this.count("player", where),
    ]);

    return {
      players,
      pagination: this.getPaginationMeta(page, limit, totalCount),
    };
  }

  /**
   * Get player by ID with optional relations
   */
  async getPlayerById(
    id: string,
    options: {
      includeUser?: boolean;
      includeTeams?: boolean;
      includeEventRatings?: boolean;
      includeEloHistory?: boolean;
    } = {}
  ) {
    const {
      includeUser = false,
      includeTeams = false,
      includeEventRatings = false,
      includeEloHistory = false,
    } = options;

    const select = {
      id: true,
      name: true,
      eloRating: true,
      experience: true,
      wins: true,
      isActive: true,
      gamesPlayed: true,
      createdAt: true,
      updatedAt: true,
      ...(includeUser && {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      }),
      ...(includeTeams && {
        teamMembers: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                color: true,
                abbreviation: true,
                logo: true,
              },
            },
          },
        },
      }),
      ...(includeEventRatings && {
        eventRatings: {
          select: {
            rating: true,
            gamesPlayed: true,
            event: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
              },
            },
          },
        },
      }),
      ...(includeEloHistory && {
        eloHistory: {
          select: {
            oldRating: true,
            newRating: true,
            timestamp: true,
            event: {
              select: {
                name: true,
                abbreviation: true,
              },
            },
          },
          orderBy: { timestamp: "desc" },
          take: 50,
        },
      }),
    };

    const player = await this.findById("player", id, select);
    if (!player) {
      throw new NotFoundError("Player");
    }
    return player;
  }

  /**
   * Get player by name
   */
  async getPlayerByName(name: string) {
    const player = await this.findMany("player", {
      where: { name },
      take: 1,
    });
    return player[0] || null;
  }

  /**
   * Create a new player
   */
  async createPlayer(data: PlayerData) {
    // Check if player with same name already exists
    const existingPlayer = await this.getPlayerByName(data.name);
    if (existingPlayer) {
      throw new ConflictError(`Player with name "${data.name}" already exists`);
    }

    return this.create("player", {
      ...data,
      eloRating: data.eloRating || 5000,
      isActive: data.isActive ?? true,
    });
  }

  /**
   * Update a player
   */
  async updatePlayer(id: string, data: UpdatePlayerData) {
    // Check if player exists
    await this.getPlayerById(id);

    // If updating name, check for conflicts
    if (data.name) {
      const existingPlayer = await this.getPlayerByName(data.name);
      if (existingPlayer && (existingPlayer as any).id !== id) {
        throw new ConflictError(
          `Player with name "${data.name}" already exists`
        );
      }
    }

    return this.updateById("player", id, data);
  }

  /**
   * Delete a player
   */
  async deletePlayer(id: string) {
    const player = await this.getPlayerById(id);

    // Check if player has associated data
    const [teamMembersCount, eloHistoryCount, eventRatingsCount] =
      await this.parallel([
        () => this.count("teamMember", { playerId: id }),
        () => this.count("eloHistory", { playerId: id }),
        () => this.count("eventRating", { playerId: id }),
      ]);

    if (teamMembersCount > 0 || eloHistoryCount > 0 || eventRatingsCount > 0) {
      throw new ConflictError(
        "Cannot delete player - they have associated team memberships, ELO history, or event ratings"
      );
    }

    await this.deleteById("player", id);
    return { message: "Player deleted successfully" };
  }

  /**
   * Get players with highest ELO ratings
   */
  async getTopPlayers(limit: number = 10) {
    return this.findMany("player", {
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        eloRating: true,
        gamesPlayed: true,
        user: {
          select: {
            image: true,
          },
        },
      },
      orderBy: { eloRating: "desc" },
      take: limit,
    });
  }

  /**
   * Get players with most games played
   */
  async getMostActivePlayers(limit: number = 10) {
    return this.findMany("player", {
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        eloRating: true,
        gamesPlayed: true,
        user: {
          select: {
            image: true,
          },
        },
      },
      orderBy: { gamesPlayed: "desc" },
      take: limit,
    });
  }

  /**
   * Update player ELO rating
   */
  async updateEloRating(
    playerId: string,
    newRating: number,
    eventId?: string
  ): Promise<void> {
    const player = await this.getPlayerById(playerId);
    const oldRating = (player as any).eloRating;

    // Update the player's rating
    await this.updateById("player", playerId, { eloRating: newRating });

    // Create ELO history entry
    await this.create("eloHistory", {
      playerId,
      oldRating,
      newRating,
      eventId,
    });
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(playerId: string) {
    const [
      player,
      teamMembersCount,
      eloHistoryCount,
      eventRatingsCount,
      recentEloHistory,
    ] = await this.parallel([
      () => this.getPlayerById(playerId),
      () => this.count("teamMember", { playerId }),
      () => this.count("eloHistory", { playerId }),
      () => this.count("eventRating", { playerId }),
      () =>
        this.findMany("eloHistory", {
          where: { playerId },
          select: {
            oldRating: true,
            newRating: true,
            timestamp: true,
            event: {
              select: {
                name: true,
                abbreviation: true,
              },
            },
          },
          orderBy: { timestamp: "desc" },
          take: 10,
        }),
    ]);

    return {
      player,
      stats: {
        teamMemberships: teamMembersCount,
        eloHistoryEntries: eloHistoryCount,
        eventRatings: eventRatingsCount,
        recentEloChanges: recentEloHistory,
      },
    };
  }
}
