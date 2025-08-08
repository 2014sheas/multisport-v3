import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    // Get 3 random players using PostgreSQL's RANDOM() function
    const players = await prisma.$queryRaw`
      SELECT id, name, "eloRating", experience
      FROM players 
      ORDER BY RANDOM() 
      LIMIT 3
    `;

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error fetching random players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
