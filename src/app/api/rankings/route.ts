import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all players with their Elo history and captain status
    const players = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
        eloRating: true,
        experience: true,
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
        captainedTeams: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        eloRating: "desc",
      },
    });

    // Calculate trend (ranking change over past 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const playersWithTrend = players.map((player, currentIndex) => {
      // Find the player's rating 24 hours ago
      const history24HoursAgo = player.eloHistory.find(
        (entry) => new Date(entry.timestamp) <= twentyFourHoursAgo
      );

      let trend = 0; // 0 = no change, positive = improved, negative = declined

      if (history24HoursAgo) {
        // Calculate what the ranking would have been 24 hours ago
        const rating24HoursAgo = history24HoursAgo.newRating;
        const playersWithHigherRating24HoursAgo = players.filter((p) => {
          const pHistory24HoursAgo = p.eloHistory.find(
            (entry) => new Date(entry.timestamp) <= twentyFourHoursAgo
          );
          return (
            pHistory24HoursAgo &&
            pHistory24HoursAgo.newRating > rating24HoursAgo
          );
        }).length;

        const rank24HoursAgo = playersWithHigherRating24HoursAgo + 1;
        const currentRank = currentIndex + 1;
        trend = rank24HoursAgo - currentRank; // Positive = improved ranking
      }

      return {
        ...player,
        rank: currentIndex + 1,
        trend,
      };
    });

    return NextResponse.json({ players: playersWithTrend });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}
