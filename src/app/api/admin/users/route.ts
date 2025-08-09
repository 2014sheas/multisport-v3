import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        player: {
          select: {
            id: true,
            name: true,
            eloRating: true,
            teamMembers: {
              select: {
                teamId: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Format users to include teamId and player data
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      rating: user.player?.eloRating || 5000,
      teamId: user.player?.teamMembers[0]?.teamId || null,
      player: user.player
        ? {
            id: user.player.id,
            name: user.player.name,
            eloRating: user.player.eloRating,
          }
        : null,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
