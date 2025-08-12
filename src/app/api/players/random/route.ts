import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const count = searchParams.get("count") || "3";
    const excludeIds = searchParams.get("excludeIds"); // Comma-separated IDs to exclude

    const playerCount = parseInt(count);
    const excludePlayerIds = excludeIds ? excludeIds.split(",") : [];

    // Get the total count of active players
    const totalActivePlayers = await prisma.player.count({
      where: { isActive: true },
    });

    if (totalActivePlayers < playerCount) {
      // If we have fewer than requested players, return all of them
      const players = await prisma.player.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          eloRating: true,
          experience: true,
        },
      });

      return NextResponse.json({
        players,
        message: `Only ${players.length} players available`,
      });
    }

    let players: any[] = [];

    if (eventId) {
      // Get random players with event-specific ratings using optimized random selection
      const eventRatings = await prisma.$queryRaw`
        WITH random_players AS (
          SELECT 
            p.id, 
            p.name, 
            p.experience,
            COALESCE(er.rating, p."eloRating") as "eloRating",
            ROW_NUMBER() OVER (ORDER BY p."eloRating" DESC) as rn
          FROM players p
          LEFT JOIN event_ratings er ON p.id = er."playerId" AND er."eventId" = ${eventId}
          WHERE p."isActive" = true
          ${
            excludePlayerIds.length > 0
              ? `AND p.id NOT IN (${excludePlayerIds
                  .map((id) => `'${id}'`)
                  .join(",")})`
              : ""
          }
        )
        SELECT 
          id, 
          name, 
          experience,
          "eloRating"
        FROM random_players
        WHERE rn IN (
          SELECT FLOOR(RANDOM() * (SELECT COUNT(*) FROM random_players)) + 1
          FROM generate_series(1, ${playerCount})
        )
        LIMIT ${playerCount}
      `;
      players = eventRatings as any[];
    } else {
      // Get random players using overall ratings with optimized random selection
      const randomPlayers = await prisma.$queryRaw`
        WITH random_players AS (
          SELECT 
            id, 
            name, 
            "eloRating", 
            experience,
            ROW_NUMBER() OVER (ORDER BY "eloRating" DESC) as rn
          FROM players 
          WHERE "isActive" = true
          ${
            excludePlayerIds.length > 0
              ? `AND id NOT IN (${excludePlayerIds
                  .map((id) => `'${id}'`)
                  .join(",")})`
              : ""
          }
        )
        SELECT 
          id, 
          name, 
          "eloRating", 
          experience
        FROM random_players
        WHERE rn IN (
          SELECT FLOOR(RANDOM() * (SELECT COUNT(*) FROM random_players)) + 1
          FROM generate_series(1, ${playerCount})
        )
        LIMIT ${playerCount}
      `;
      players = randomPlayers as any[];
    }

    // If we didn't get enough players due to exclusion, fill with additional random players
    if (players.length < playerCount && excludePlayerIds.length > 0) {
      const additionalPlayers = await prisma.$queryRaw`
        SELECT 
          p.id, 
          p.name, 
          p.experience,
          COALESCE(er.rating, p."eloRating") as "eloRating"
        FROM players p
        LEFT JOIN event_ratings er ON p.id = er."playerId" AND er."eventId" = ${
          eventId || "NULL"
        }
        WHERE p."isActive" = true
        AND p.id NOT IN (${excludePlayerIds.map((id) => `'${id}'`).join(",")})
        ORDER BY RANDOM()
        LIMIT ${playerCount - players.length}
      `;

      players = [...players, ...(additionalPlayers as any[])];
    }

    return NextResponse.json({
      players,
      totalAvailable: totalActivePlayers - excludePlayerIds.length,
      performance: {
        method: "optimized_random_selection",
        optimization: "fast_transitions",
      },
    });
  } catch (error) {
    console.error("Error fetching random players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
