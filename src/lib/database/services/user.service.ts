/**
 * User database service
 * Handles all user-related database operations with optimized queries
 */

import { BaseService } from "./base.service";
import { NotFoundError } from "@/lib/errors";

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  playerId: string | null;
}

export interface PlayerWithProfile {
  id: string;
  name: string;
  profilePicture: string | null;
  [key: string]: any;
}

export class UserService extends BaseService {
  /**
   * Get user profile data by ID
   */
  async getUserProfile(userId: string): Promise<UserProfileData | null> {
    const user = await this.findById("user", userId);

    return user as UserProfileData | null;
  }

  /**
   * Get user profile data by player ID
   */
  async getUserByPlayerId(playerId: string): Promise<UserProfileData | null> {
    const users = await this.findMany("user", {
      where: { playerId },
      take: 1,
    });
    const user = users[0] || null;

    return user as UserProfileData | null;
  }

  /**
   * Get profile pictures for multiple players (optimized batch query)
   * This replaces the duplicated profile picture lookup logic across multiple routes
   */
  async getPlayerProfilePictures(
    playerIds: string[]
  ): Promise<Map<string, string | null>> {
    if (playerIds.length === 0) {
      return new Map();
    }

    const users = await this.findMany("user", {
      where: {
        playerId: { in: playerIds },
      },
      select: {
        playerId: true,
        image: true,
      },
    });

    const profilePictureMap = new Map<string, string | null>();
    users.forEach((user: any) => {
      if (user.playerId) {
        profilePictureMap.set(user.playerId, user.image);
      }
    });

    return profilePictureMap;
  }

  /**
   * Get players with their profile pictures (optimized single query)
   * This replaces the pattern of fetching players then separately fetching profile pictures
   */
  async getPlayersWithProfiles(
    playerIds: string[],
    options: {
      includeUserData?: boolean;
    } = {}
  ): Promise<Array<PlayerWithProfile>> {
    if (playerIds.length === 0) {
      return [];
    }

    const { includeUserData = false } = options;

    const players = await this.findMany("player", {
      where: { id: { in: playerIds } },
      select: {
        id: true,
        name: true,
        eloRating: true,
        experience: true,
        wins: true,
        gamesPlayed: true,
        user: includeUserData
          ? {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            }
          : {
              select: {
                image: true,
              },
            },
      },
    });

    return players.map((player: any) => ({
      id: player.id,
      name: player.name,
      eloRating: player.eloRating,
      experience: player.experience,
      wins: player.wins,
      gamesPlayed: player.gamesPlayed,
      profilePicture: player.user?.image || null,
      ...(includeUserData && {
        user: player.user,
      }),
    }));
  }

  /**
   * Get a single player with profile picture
   */
  async getPlayerWithProfile(
    playerId: string
  ): Promise<PlayerWithProfile | null> {
    const players = await this.getPlayersWithProfiles([playerId]);
    return players[0] || null;
  }

  /**
   * Update user profile picture
   */
  async updateProfilePicture(
    userId: string,
    imageData: string
  ): Promise<UserProfileData> {
    const user = await this.updateById("user", userId, {
      image: imageData,
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    return user as UserProfileData;
  }

  /**
   * Get user with linked player data (for profile pages)
   */
  async getUserWithPlayer(userId: string): Promise<{
    user: UserProfileData;
    player: any;
  } | null> {
    const user = await this.findById("user", userId);

    if (!user) {
      return null;
    }

    return {
      user: {
        id: (user as any).id,
        name: (user as any).name,
        email: (user as any).email,
        image: (user as any).image,
        playerId: (user as any).playerId,
      },
      player: null, // Simplified for now
    };
  }

  /**
   * Batch get users with their linked players (for admin interfaces)
   */
  async getUsersWithPlayers(userIds: string[]): Promise<
    Array<{
      user: UserProfileData;
      player: any;
    }>
  > {
    if (userIds.length === 0) {
      return [];
    }

    const users = await this.findMany("user", {
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        playerId: true,
        player: {
          select: {
            id: true,
            name: true,
            experience: true,
            wins: true,
            eloRating: true,
            gamesPlayed: true,
          },
        },
      },
    });

    return users.map((user: any) => ({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        playerId: user.playerId,
      },
      player: user.player,
    }));
  }

  /**
   * Search users by name or email (for admin interfaces)
   */
  async searchUsers(
    searchTerm: string,
    options: {
      limit?: number;
      includePlayers?: boolean;
    } = {}
  ): Promise<UserProfileData[]> {
    const { limit = 50, includePlayers = false } = options;

    const users = await this.findMany("user", {
      where: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        playerId: true,
        ...(includePlayers && {
          player: {
            select: {
              id: true,
              name: true,
              eloRating: true,
            },
          },
        }),
      },
      take: limit,
    });

    return users as UserProfileData[];
  }
}
