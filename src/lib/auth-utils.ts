import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  return session;
}

export async function requireAdmin() {
  const session = await getSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  if (!session.user.isAdmin) {
    throw new Error("Admin privileges required");
  }

  return session;
}

export function createAuthErrorResponse(message: string, status: number = 401) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(
  handler: (req: NextRequest, session: Session) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const session = await requireAuth();
      return handler(req, session);
    } catch {
      return createAuthErrorResponse("Authentication required");
    }
  };
}

export async function withAdmin(
  handler: (req: NextRequest, session: Session) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const session = await requireAdmin();
      return handler(req, session);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Admin privileges required"
      ) {
        return createAuthErrorResponse("Admin privileges required", 403);
      }
      return createAuthErrorResponse("Authentication required");
    }
  };
}
