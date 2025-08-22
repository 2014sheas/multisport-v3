import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

// Simple in-memory cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

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
    // Use database-level text search for better performance
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

    // Check cache first for non-search queries
    const cacheKey = `players_${page}_${limit}_${sortBy}_${sortOrder}_${search}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && !search) {
      console.log("📦 Returning cached players data");
      return NextResponse.json(cached.data);
    }

    // Single optimized query with pagination and selective relations
    // Using database indexes for faster sorting and filtering
    // Add query timeout and connection hints for better performance
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
        // Optimize team membership query with proper indexing
        teamMembers: {
          select: {
            teamId: true,
          },
          // Use orderBy to ensure consistent results
          orderBy: {
            joinedAt: "desc",
          },
          take: 1,
        },
        // Include event ratings to calculate accurate average ratings
        eventRatings: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count only if we need pagination info
    // Optimize by avoiding count query when possible
    let totalCount: number;
    if (players.length === limit) {
      // Use raw SQL for count when we need the full total
      // This is often faster than Prisma's count() for large datasets
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count 
        FROM players p 
        LEFT JOIN users u ON p."userId" = u.id 
        WHERE ${
          search
            ? `(
          LOWER(p.name) LIKE LOWER(${`%${search}%`}) OR 
          LOWER(u.email) LIKE LOWER(${`%${search}%`})
        )`
            : "TRUE"
        }
      `;
      totalCount = Number(countResult[0].count);
    } else {
      totalCount = (page - 1) * limit + players.length;
    }

    console.log(
      `✅ Found ${players.length} players (page ${page}/${Math.ceil(
        totalCount / limit
      )})`
    );

    // Format players to include teamId and calculate accurate average ratings
    const formattedPlayers = players.map((player) => ({
      id: player.id,
      name: player.name,
      eloRating:
        player.eventRatings.length > 0
          ? Math.round(
              player.eventRatings.reduce((sum, er) => sum + er.rating, 0) /
                player.eventRatings.length
            )
          : player.eloRating,
      experience: player.experience || 0,
      wins: player.wins || 0,
      isActive: player.isActive,
      gamesPlayed: player.gamesPlayed,
      teamId: player.teamMembers[0]?.teamId || null,
      user: player.user,
    }));

    // Cache the result for non-search queries
    if (!search) {
      const responseData = {
        players: formattedPlayers,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
      cache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      });
      console.log("💾 Cached players data");
    }

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

    // Create the player and event ratings for all existing events in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the player
      const player = await tx.player.create({
        data: {
          name,
          eloRating: eloRating || 5000,
          experience: experience !== undefined ? experience : null,
          wins: wins !== undefined ? wins : null,
        },
      });

      // Get all events
      const events = await tx.event.findMany({
        select: { id: true },
      });

      // Create event ratings for all events with default rating of 5000
      if (events.length > 0) {
        const eventRatings = events.map((event) => ({
          playerId: player.id,
          eventId: event.id,
          rating: 5000,
        }));

        await tx.eventRating.createMany({
          data: eventRatings,
        });
      }

      return player;
    });

    return NextResponse.json({ player: result });
  } catch (error) {
    console.error("Error creating player:", error);
    return NextResponse.json(
      { error: "Failed to create player" },
      { status: 500 }
    );
  }
}
