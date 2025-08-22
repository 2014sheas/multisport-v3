import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the user with their linked player
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        image: true,
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.player) {
      return NextResponse.json(
        { error: "No player account linked to this user" },
        { status: 404 }
      );
    }

    // Combine player data with user's profile picture
    const playerWithProfile = {
      ...user.player,
      profilePicture: user.image,
    };

    return NextResponse.json({ player: playerWithProfile });
  } catch (error) {
    console.error("Error fetching player data:", error);
    return NextResponse.json(
      { error: "Failed to fetch player data" },
      { status: 500 }
    );
  }
}
