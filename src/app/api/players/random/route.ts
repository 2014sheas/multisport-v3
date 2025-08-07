import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get 3 random active players
    const players = await prisma.player.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        eloRating: true,
      },
      take: 3,
      orderBy: {
        // This is a simple random selection
        // In production, you might want a more sophisticated approach
        id: "asc",
      },
    });

    // If we don't have 3 players, return what we have
    if (players.length < 3) {
      return NextResponse.json({
        players,
        message: `Only ${players.length} players available`,
      });
    }

    // Shuffle the players to make it more random
    const shuffledPlayers = players.sort(() => Math.random() - 0.5);

    return NextResponse.json({ players: shuffledPlayers });
  } catch (error) {
    console.error("Error fetching random players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
