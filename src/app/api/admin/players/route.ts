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

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    console.log("🔍 Fetching players from database...");

    // Build where clause for search
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            {
              user: {
                email: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {};

    // Get total count for pagination
    const totalCount = await prisma.player.count({ where: whereClause });

    // Optimized query with pagination and selective relations
    const players = await prisma.player.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        eloRating: true,
        experience: true,
        wins: true,
        isActive: true,
        gamesPlayed: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // Only get the first team membership to avoid N+1 queries
        teamMembers: {
          take: 1,
          select: {
            teamId: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    console.log(
      `✅ Found ${players.length} players (page ${page}/${Math.ceil(
        totalCount / limit
      )})`
    );

    // Format players to include teamId
    const formattedPlayers = players.map((player) => ({
      id: player.id,
      name: player.name,
      eloRating: player.eloRating,
      experience: player.experience || 0,
      wins: player.wins || 0,
      isActive: player.isActive,
      gamesPlayed: player.gamesPlayed,
      teamId: player.teamMembers[0]?.teamId || null,
      user: player.user,
    }));

    return NextResponse.json({
      players: formattedPlayers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
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
        experience: experience !== undefined ? experience : null,
        wins: wins !== undefined ? wins : null,
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
