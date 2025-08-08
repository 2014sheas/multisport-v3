import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all active players with their Elo history
    const players = await prisma.player.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        eloRating: true,
        eloHistory: {
          select: {
            oldRating: true,
            newRating: true,
            timestamp: true,
          },
          orderBy: {
            timestamp: "asc",
          },
        },
      },
      orderBy: {
        eloRating: "desc",
      },
    });

    // Add rank to each player
    const playersWithRank = players.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));

    return NextResponse.json({ players: playersWithRank });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}
