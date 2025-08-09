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

    console.log("🔍 Fetching players from database...");

    const players = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
        eloRating: true,
        experience: true,
        wins: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        teamMembers: {
          select: {
            teamId: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(`✅ Found ${players.length} players`);

    // Format players to include teamId
    const formattedPlayers = players.map((player) => ({
      id: player.id,
      name: player.name,
      eloRating: player.eloRating,
      experience: player.experience,
      wins: player.wins,
      teamId: player.teamMembers[0]?.teamId || null,
      user: player.user,
    }));

    return NextResponse.json({ players: formattedPlayers });
  } catch (error) {
    console.error("❌ Error fetching players:", error);

    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Failed to fetch players",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, eloRating, experience, wins } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const player = await prisma.player.create({
      data: {
        name,
        eloRating: eloRating || 5000,
        experience: experience || 0,
        wins: wins || 0,
      },
    });

    return NextResponse.json({ player });
  } catch (error) {
    console.error("Error creating player:", error);
    return NextResponse.json(
      { error: "Failed to create player" },
      { status: 500 }
    );
  }
}
