/**
 * Team Membership database service
 * Handles all team membership and captain-related database operations
 */

import { BaseService } from "./base.service";
import { NotFoundError } from "@/lib/errors";

export interface TeamMembershipData {
  teamId: string;
  playerId: string;
  joinedAt: Date;
  year: number;
}

export interface CaptainData {
  teamId: string;
  teamName: string;
  captainId: string;
}

export interface TeamMembershipInfo {
  teamId: string;
  teamName: string;
  teamColor: string;
  teamAbbreviation: string | null;
  teamLogo: string | null;
  isCaptain: boolean;
  joinedAt: Date;
  year: number;
}

export class TeamMembershipService extends BaseService {
  /**
   * Get team memberships for multiple players (optimized batch query)
   * This replaces the duplicated team membership lookup logic across multiple routes
   */
  async getPlayerTeamMemberships(
    playerIds: string[],
    year?: number
  ): Promise<Map<string, TeamMembershipData[]>> {
    if (playerIds.length === 0) {
      return new Map();
    }

    const memberships = await this.findMany("teamMember", {
      where: {
        playerId: { in: playerIds },
        ...(year && { year }),
      },
      select: {
        teamId: true,
        playerId: true,
        joinedAt: true,
        year: true,
      },
    });

    const membershipMap = new Map<string, TeamMembershipData[]>();
    memberships.forEach((membership: any) => {
      if (!membershipMap.has(membership.playerId)) {
        membershipMap.set(membership.playerId, []);
      }
      membershipMap.get(membership.playerId)!.push({
        teamId: membership.teamId,
        playerId: membership.playerId,
        joinedAt: membership.joinedAt,
        year: membership.year,
      });
    });

    return membershipMap;
  }

  /**
   * Get captain data for multiple players (optimized batch query)
   * This replaces the duplicated captain lookup logic across multiple routes
   */
  async getPlayerCaptainData(
    playerIds: string[],
    year?: number
  ): Promise<Map<string, CaptainData[]>> {
    if (playerIds.length === 0) {
      return new Map();
    }

    const teams = await this.findMany("team", {
      where: {
        captainId: { in: playerIds },
        ...(year && { year }),
      },
      select: {
        id: true,
        name: true,
        captainId: true,
      },
    });

    const captainMap = new Map<string, CaptainData[]>();
    teams.forEach((team: any) => {
      if (!captainMap.has(team.captainId)) {
        captainMap.set(team.captainId, []);
      }
      captainMap.get(team.captainId)!.push({
        teamId: team.id,
        teamName: team.name,
        captainId: team.captainId,
      });
    });

    return captainMap;
  }

  /**
   * Get team membership info for a player (includes team details and captain status)
   */
  async getPlayerTeamMembershipInfo(
    playerId: string,
    year?: number
  ): Promise<TeamMembershipInfo[]> {
    const memberships = await this.findMany("teamMember", {
      where: {
        playerId,
        ...(year && { year }),
      },
      select: {
        teamId: true,
        joinedAt: true,
        year: true,
        team: {
          select: {
            id: true,
            name: true,
            color: true,
            abbreviation: true,
            logo: true,
            captainId: true,
          },
        },
      },
    });

    return memberships.map((membership: any) => ({
      teamId: membership.teamId,
      teamName: membership.team.name,
      teamColor: membership.team.color,
      teamAbbreviation: membership.team.abbreviation,
      teamLogo: membership.team.logo,
      isCaptain: membership.team.captainId === playerId,
      joinedAt: membership.joinedAt,
      year: membership.year,
    }));
  }

  /**
   * Check if a player is a captain of any team
   */
  async isPlayerCaptain(playerId: string, year?: number): Promise<boolean> {
    const count = await this.count("team", {
      captainId: playerId,
      ...(year && { year }),
    });

    return count > 0;
  }

  /**
   * Get all teams where a player is captain
   */
  async getPlayerCaptainTeams(
    playerId: string,
    year?: number
  ): Promise<CaptainData[]> {
    const teams = await this.findMany("team", {
      where: {
        captainId: playerId,
        ...(year && { year }),
      },
      select: {
        id: true,
        name: true,
        captainId: true,
      },
    });

    return teams.map((team: any) => ({
      teamId: team.id,
      teamName: team.name,
      captainId: team.captainId,
    }));
  }

  /**
   * Get team members for a specific team
   */
  async getTeamMembers(
    teamId: string,
    year?: number
  ): Promise<
    Array<{
      playerId: string;
      playerName: string;
      joinedAt: Date;
      isCaptain: boolean;
    }>
  > {
    const members = await this.findMany("teamMember", {
      where: {
        teamId,
        ...(year && { year }),
      },
      select: {
        playerId: true,
        joinedAt: true,
        player: {
          select: {
            name: true,
          },
        },
        team: {
          select: {
            captainId: true,
          },
        },
      },
    });

    return members.map((member: any) => ({
      playerId: member.playerId,
      playerName: member.player.name,
      joinedAt: member.joinedAt,
      isCaptain: member.team.captainId === member.playerId,
    }));
  }

  /**
   * Add a player to a team
   */
  async addPlayerToTeam(
    teamId: string,
    playerId: string,
    year?: number
  ): Promise<void> {
    // Check if player is already on team
    const existingMembership = await this.exists("teamMember", {
      teamId,
      playerId,
      year: year || new Date().getFullYear(),
    });

    if (existingMembership) {
      throw new Error("Player is already on this team");
    }

    await this.create("teamMember", {
      teamId,
      playerId,
      year: year || new Date().getFullYear(),
    });
  }

  /**
   * Remove a player from a team
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
   * Set a player as team captain
   */
  async setTeamCaptain(teamId: string, playerId: string): Promise<void> {
    // Verify the player is a member of the team
    const membership = await this.exists("teamMember", {
      teamId,
      playerId,
    });

    if (!membership) {
      throw new Error("Player must be a team member before becoming captain");
    }

    await this.updateById("team", teamId, {
      captainId: playerId,
    });
  }

  /**
   * Remove captain status from a team
   */
  async removeTeamCaptain(teamId: string): Promise<void> {
    await this.updateById("team", teamId, {
      captainId: null,
    });
  }

  /**
   * Get team data with captain information (for team management)
   */
  async getTeamWithCaptain(teamId: string): Promise<{
    id: string;
    name: string;
    abbreviation: string | null;
    color: string;
    logo: string | null;
    captainId: string | null;
    captain: {
      id: string;
      name: string;
      userId: string | null;
    } | null;
  } | null> {
    // Simplified implementation for now
    const team = await this.findById("team", teamId);
    if (!team) return null;

    return {
      id: (team as any).id,
      name: (team as any).name,
      abbreviation: (team as any).abbreviation,
      color: (team as any).color,
      logo: (team as any).logo,
      captainId: (team as any).captainId,
      captain: null,
    };
  }

  /**
   * Get team data by abbreviation with captain information
   */
  async getTeamByAbbreviationWithCaptain(
    abbreviation: string,
    year?: number
  ): Promise<{
    id: string;
    name: string;
    abbreviation: string | null;
    color: string;
    logo: string | null;
    captainId: string | null;
    captain: {
      id: string;
      name: string;
      userId: string | null;
    } | null;
  } | null> {
    // Simplified implementation for now
    const teams = await this.findMany("team", {
      where: {
        abbreviation,
        ...(year && { year }),
      },
      take: 1,
    });

    if (!teams[0]) return null;
    const team = teams[0] as any;

    return {
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      color: team.color,
      logo: team.logo,
      captainId: team.captainId,
      captain: null,
    };
  }
}
