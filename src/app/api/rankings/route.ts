import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all players ordered by rating
    const players = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
        eloRating: true,
      },
      orderBy: {
        eloRating: "desc",
      },
    });

    // Calculate trend (ranking change over past 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const playersWithTrend = await Promise.all(
      players.map(async (player, currentIndex) => {
        // Get Elo history for this player within the last 24 hours
        const recentHistory = await prisma.eloHistory.findMany({
          where: {
            playerId: player.id,
            timestamp: {
              gte: twentyFourHoursAgo,
            },
          },
          orderBy: {
            timestamp: "desc",
          },
        });

        let trend = 0; // 0 = no change, positive = improved ranking, negative = declined ranking

        if (recentHistory.length > 0) {
          // Calculate the total rating change over the 24-hour period
          const totalRatingChange = recentHistory.reduce((total, entry) => {
            return total + (entry.newRating - entry.oldRating);
          }, 0);

          // If rating increased, trend is positive (improved ranking)
          // If rating decreased, trend is negative (declined ranking)
          // Scale the trend based on the magnitude of the rating change
          trend =
            Math.sign(totalRatingChange) *
            Math.min(Math.abs(totalRatingChange) / 100, 5);
        }

        // Get captain status
        const captainedTeams = await prisma.team.findMany({
          where: {
            captainId: player.id,
          },
          select: {
            id: true,
            name: true,
          },
        });

        // Get team membership
        const teamMembership = await prisma.teamMember.findFirst({
          where: {
            playerId: player.id,
          },
        });

        // Get team info if player is on a team
        let teamInfo = null;
        if (teamMembership) {
          const team = await prisma.team.findUnique({
            where: { id: teamMembership.teamId },
            select: {
              id: true,
              name: true,
              color: true,
              abbreviation: true,
            },
          });
          teamInfo = team;
        }

        return {
          id: player.id,
          name: player.name,
          eloRating: player.eloRating,
          experience: 0, // Temporary fix
          rank: currentIndex + 1,
          trend: Math.round(trend),
          captainedTeams,
          team: teamInfo,
        };
      })
    );

    return NextResponse.json({ players: playersWithTrend });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}
