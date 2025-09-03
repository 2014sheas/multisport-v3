/**
 * Authentication helper functions
 * Reusable utilities for common authentication patterns
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import type { Session } from "next-auth";

export interface AuthHelperContext {
  user: {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    isScorekeeper: boolean;
    emailVerified: boolean;
  };
  role: "user" | "scorekeeper" | "admin";
}

/**
 * Get user role from session
 */
export function getUserRole(
  session: Session
): "user" | "scorekeeper" | "admin" {
  if (session.user.isAdmin) return "admin";
  if ((session.user as any).isScorekeeper) return "scorekeeper";
  return "user";
}

/**
 * Check if user has required role
 */
export function hasRequiredRole(
  userRole: "user" | "scorekeeper" | "admin",
  requiredRole: "user" | "scorekeeper" | "admin"
): boolean {
  const roleHierarchy = { user: 0, scorekeeper: 1, admin: 2 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Get authenticated session (throws if not authenticated)
 */
export async function requireSession(): Promise<Session> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new AuthenticationError();
  }

  return session;
}

/**
 * Get authenticated user context (throws if not authenticated)
 */
export async function requireAuthContext(): Promise<AuthHelperContext> {
  const session = await requireSession();

  return {
    user: {
      id: session.user.id!,
      email: session.user.email!,
      name: session.user.name!,
      isAdmin: session.user.isAdmin || false,
      isScorekeeper: (session.user as any).isScorekeeper || false,
      emailVerified: session.user.emailVerified || false,
    },
    role: getUserRole(session),
  };
}

/**
 * Require specific role (throws if user doesn't have required role)
 */
export async function requireRoleContext(
  requiredRole: "user" | "scorekeeper" | "admin"
): Promise<AuthHelperContext> {
  const context = await requireAuthContext();

  if (!hasRequiredRole(context.role, requiredRole)) {
    throw new AuthorizationError(`${requiredRole} privileges required`);
  }

  return context;
}

/**
 * Require admin privileges
 */
export async function requireAdminContext(): Promise<AuthHelperContext> {
  return requireRoleContext("admin");
}

/**
 * Require scorekeeper privileges (includes admins)
 */
export async function requireScorekeeperContext(): Promise<AuthHelperContext> {
  return requireRoleContext("scorekeeper");
}

/**
 * Check if user is team captain
 */
export async function isTeamCaptain(
  teamId: string,
  userId: string
): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma");

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      captain: {
        select: {
          user: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  return team?.captain?.user?.id === userId;
}

/**
 * Check if user can manage team (captain or admin)
 */
export async function canManageTeam(
  teamId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<boolean> {
  if (isAdmin) return true;

  return await isTeamCaptain(teamId, userId);
}

/**
 * Get user's team memberships
 */
export async function getUserTeamMemberships(
  userId: string,
  year?: number
): Promise<
  Array<{
    teamId: string;
    teamName: string;
    isCaptain: boolean;
  }>
> {
  const { prisma } = await import("@/lib/prisma");

  const memberships = await prisma.teamMember.findMany({
    where: {
      player: {
        user: {
          id: userId,
        },
      },
      ...(year && { year }),
    },
    select: {
      teamId: true,
      team: {
        select: {
          name: true,
          captainId: true,
        },
      },
      player: {
        select: {
          id: true,
        },
      },
    },
  });

  return memberships.map((membership: any) => ({
    teamId: membership.teamId,
    teamName: membership.team.name,
    isCaptain: membership.team.captainId === membership.player.id,
  }));
}

/**
 * Check if user owns a resource
 */
export async function isResourceOwner(
  resourceType: "player" | "user",
  resourceId: string,
  userId: string
): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma");

  if (resourceType === "user") {
    return resourceId === userId;
  }

  if (resourceType === "player") {
    const player = await prisma.player.findUnique({
      where: { id: resourceId },
      select: { user: { select: { id: true } } },
    });

    return player?.user?.id === userId;
  }

  return false;
}

/**
 * Get user's player ID
 */
export async function getUserPlayerId(userId: string): Promise<string | null> {
  const { prisma } = await import("@/lib/prisma");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { playerId: true },
  });

  return user?.playerId || null;
}

/**
 * Check if user has permission
 */
export function hasPermission(
  userRole: "user" | "scorekeeper" | "admin",
  permission: string
): boolean {
  const permissions: Record<string, ("user" | "scorekeeper" | "admin")[]> = {
    "manage.users": ["admin"],
    "manage.players": ["admin"],
    "manage.teams": ["admin"],
    "manage.events": ["admin"],
    "manage.games": ["admin", "scorekeeper"],
    "view.admin": ["admin"],
    "score.games": ["admin", "scorekeeper"],
    vote: ["user", "scorekeeper", "admin"],
    "view.profile": ["user", "scorekeeper", "admin"],
  };

  const allowedRoles = permissions[permission];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(userRole);
}

/**
 * Require specific permission
 */
export async function requirePermission(
  permission: string
): Promise<AuthHelperContext> {
  const context = await requireAuthContext();

  if (!hasPermission(context.role, permission)) {
    throw new AuthorizationError(`Permission "${permission}" required`);
  }

  return context;
}

/**
 * Get optional session (returns null if not authenticated)
 */
export async function getOptionalSession(): Promise<Session | null> {
  return await getServerSession(authOptions);
}

/**
 * Get optional auth context (returns null if not authenticated)
 */
export async function getOptionalAuth(): Promise<AuthHelperContext | null> {
  const session = await getOptionalSession();

  if (!session?.user) {
    return null;
  }

  return {
    user: {
      id: session.user.id!,
      email: session.user.email!,
      name: session.user.name!,
      isAdmin: session.user.isAdmin || false,
      isScorekeeper: (session.user as any).isScorekeeper || false,
      emailVerified: session.user.emailVerified || false,
    },
    role: getUserRole(session),
  };
}
