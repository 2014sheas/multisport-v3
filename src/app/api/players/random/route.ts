import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    // Get the total count of players
    const totalPlayers = await prisma.player.count();

    if (totalPlayers < 3) {
      // If we have fewer than 3 players, return all of them
      const players = await prisma.player.findMany({
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
      // Get 3 random players with event-specific ratings
      const eventRatings = await prisma.$queryRaw`
        SELECT 
          p.id, 
          p.name, 
          p.experience,
          COALESCE(er.rating, p."eloRating") as "eloRating"
        FROM players p
        LEFT JOIN event_ratings er ON p.id = er."playerId" AND er."eventId" = ${eventId}
        WHERE p."isActive" = true
        ORDER BY RANDOM() 
        LIMIT 3
      `;
      players = eventRatings as any[];
    } else {
      // Get 3 random players using overall ratings
      const randomPlayers = await prisma.$queryRaw`
        SELECT id, name, "eloRating", experience
        FROM players 
        WHERE "isActive" = true
        ORDER BY RANDOM() 
        LIMIT 3
      `;
      players = randomPlayers as any[];
    }

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error fetching random players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
