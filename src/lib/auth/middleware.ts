/**
 * Enhanced authentication middleware
 * Provides role-based access control and integrates with error handling
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { withErrorHandling } from "@/lib/api-handler";

export type UserRole = "admin" | "scorekeeper" | "user";

export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    isScorekeeper: boolean;
    emailVerified: boolean;
  };
  role: UserRole;
}

// Helper function to determine user role
function getUserRole(user: any): UserRole {
  if (user.isAdmin) return "admin";
  if (user.isScorekeeper) return "scorekeeper";
  return "user";
}

// Helper function to check if user has required role
function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    scorekeeper: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Base authentication middleware
export function withAuth(
  options: {
    path?: string;
    required?: boolean;
  } = {}
) {
  return (
    handler: (request: NextRequest, context: AuthContext) => Promise<any>
  ) => {
    return withErrorHandling(async (request: NextRequest, context?: any) => {
      const session = await getServerSession(authOptions);

      if (!session?.user) {
        if (options.required !== false) {
          throw new AuthenticationError();
        }
        // If authentication is not required, pass null context
        return handler(request, null as any);
      }

      const authContext: AuthContext = {
        user: {
          id: session.user.id!,
          email: session.user.email!,
          name: session.user.name!,
          isAdmin: session.user.isAdmin || false,
          isScorekeeper: session.user.isScorekeeper || false,
          emailVerified: session.user.emailVerified || false,
        },
        role: getUserRole(session.user),
      };

      return handler(request, authContext);
    }, options.path);
  };
}

// Role-based authentication middleware
export function withRole(
  requiredRole: UserRole,
  options: {
    path?: string;
    allowHigherRoles?: boolean;
  } = {}
) {
  const { allowHigherRoles = true } = options;

  return (
    handler: (request: NextRequest, context: AuthContext) => Promise<any>
  ) => {
    return withAuth(options)(
      async (request: NextRequest, context: AuthContext) => {
        if (!context) {
          throw new AuthenticationError();
        }

        const hasRole = allowHigherRoles
          ? hasRequiredRole(context.role, requiredRole)
          : context.role === requiredRole;

        if (!hasRole) {
          throw new AuthorizationError(`${requiredRole} privileges required`);
        }

        return handler(request, context);
      }
    );
  };
}

// Admin-only middleware
export function withAdmin(
  options: {
    path?: string;
  } = {}
) {
  return withRole("admin", options);
}

// Scorekeeper or admin middleware
export function withScorekeeper(
  options: {
    path?: string;
  } = {}
) {
  return withRole("scorekeeper", options);
}

// Email verification middleware
export function withEmailVerification(
  options: {
    path?: string;
  } = {}
) {
  return (
    handler: (request: NextRequest, context: AuthContext) => Promise<any>
  ) => {
    return withAuth(options)(
      async (request: NextRequest, context: AuthContext) => {
        if (!context) {
          throw new AuthenticationError();
        }

        if (!context.user.emailVerified) {
          throw new AuthorizationError("Email verification required");
        }

        return handler(request, context);
      }
    );
  };
}

// Combined middleware for common patterns
export function withAdminAuth(
  options: {
    path?: string;
  } = {}
) {
  return withAdmin(options);
}

export function withScorekeeperAuth(
  options: {
    path?: string;
  } = {}
) {
  return withScorekeeper(options);
}

export function withVerifiedUser(
  options: {
    path?: string;
  } = {}
) {
  return withEmailVerification(options);
}

// Middleware for checking specific permissions
export function withPermission(
  permission: string,
  options: {
    path?: string;
  } = {}
) {
  return (
    handler: (request: NextRequest, context: AuthContext) => Promise<any>
  ) => {
    return withAuth(options)(
      async (request: NextRequest, context: AuthContext) => {
        if (!context) {
          throw new AuthenticationError();
        }

        // Define permission mappings
        const permissions: Record<string, UserRole[]> = {
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
          throw new AuthorizationError(`Unknown permission: ${permission}`);
        }

        if (!allowedRoles.includes(context.role)) {
          throw new AuthorizationError(`Permission "${permission}" required`);
        }

        return handler(request, context);
      }
    );
  };
}

// Middleware for resource ownership checks
export function withResourceOwnership(
  resourceType: string,
  getResourceOwnerId: (
    request: NextRequest,
    context: AuthContext
  ) => Promise<string | null>,
  options: {
    path?: string;
    allowAdmins?: boolean;
  } = {}
) {
  const { allowAdmins = true } = options;

  return (
    handler: (request: NextRequest, context: AuthContext) => Promise<any>
  ) => {
    return withAuth(options)(
      async (request: NextRequest, context: AuthContext) => {
        if (!context) {
          throw new AuthenticationError();
        }

        // Allow admins to access any resource
        if (allowAdmins && context.role === "admin") {
          return handler(request, context);
        }

        const resourceOwnerId = await getResourceOwnerId(request, context);

        if (!resourceOwnerId) {
          throw new AuthorizationError(`${resourceType} not found`);
        }

        if (resourceOwnerId !== context.user.id) {
          throw new AuthorizationError(
            `You can only access your own ${resourceType}`
          );
        }

        return handler(request, context);
      }
    );
  };
}

// Helper function to get user from session (for use in API routes)
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return {
    user: {
      id: session.user.id!,
      email: session.user.email!,
      name: session.user.name!,
      isAdmin: session.user.isAdmin || false,
      isScorekeeper: session.user.isScorekeeper || false,
      emailVerified: session.user.emailVerified || false,
    },
    role: getUserRole(session.user),
  };
}

// Helper function to require authentication in API routes
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    throw new AuthenticationError();
  }

  return context;
}

// Helper function to require specific role
export async function requireRole(
  requiredRole: UserRole
): Promise<AuthContext> {
  const context = await requireAuth();

  if (!hasRequiredRole(context.role, requiredRole)) {
    throw new AuthorizationError(`${requiredRole} privileges required`);
  }

  return context;
}
