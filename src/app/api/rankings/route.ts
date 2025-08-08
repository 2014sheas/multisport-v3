import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    let players: any[] = [];

    if (eventId) {
      // Get event-specific rankings - only players who have ratings for this event
      const eventRatings = await prisma.eventRating.findMany({
        where: {
          eventId: eventId,
        },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              experience: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            },
          },
        },
        orderBy: {
          rating: "desc",
        },
      });

      // Calculate trend for event-specific ratings
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      players = await Promise.all(
        eventRatings.map(async (eventRating, currentIndex) => {
          // Get Elo history for this player within the last 24 hours for this event
          const recentHistory = await prisma.eloHistory.findMany({
            where: {
              playerId: eventRating.playerId,
              eventId: eventId,
              timestamp: {
                gte: twentyFourHoursAgo,
              },
            },
            orderBy: {
              timestamp: "desc",
            },
          });

          let trend = 0;
          if (recentHistory.length > 0) {
            const totalRatingChange = recentHistory.reduce((total, entry) => {
              return total + (entry.newRating - entry.oldRating);
            }, 0);
            trend =
              Math.sign(totalRatingChange) *
              Math.min(Math.abs(totalRatingChange) / 100, 5);
          }

          // Get captain status
          const captainedTeams = await prisma.team.findMany({
            where: {
              captainId: eventRating.playerId,
            },
            select: {
              id: true,
              name: true,
            },
          });

          // Get team membership
          const teamMembership = await prisma.teamMember.findFirst({
            where: {
              playerId: eventRating.playerId,
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
            id: eventRating.player.id,
            name: eventRating.player.name,
            eloRating: eventRating.rating,
            experience: eventRating.player.experience || 0,
            rank: currentIndex + 1,
            trend: Math.round(trend),
            captainedTeams,
            team: teamInfo,
            eventId: eventRating.event.id,
            eventName: eventRating.event.name,
            eventAbbreviation: eventRating.event.abbreviation,
            gamesPlayed: eventRating.gamesPlayed,
          };
        })
      );
    } else {
      // Get overall rankings (average of all event ratings)
      const playersWithEventRatings = await prisma.player.findMany({
        select: {
          id: true,
          name: true,
          experience: true,
          eventRatings: {
            select: {
              rating: true,
            },
          },
        },
      });

      // Calculate average ratings and sort by them
      const playersWithAverages = playersWithEventRatings
        .map((player) => {
          let overallRating = 5000; // Default rating if no event ratings exist
          if (player.eventRatings.length > 0) {
            const totalRating = player.eventRatings.reduce(
              (sum, er) => sum + er.rating,
              0
            );
            overallRating = Math.round(
              totalRating / player.eventRatings.length
            );
          }
          return {
            ...player,
            eloRating: overallRating,
          };
        })
        .sort((a, b) => b.eloRating - a.eloRating);

      // Calculate trend (ranking change over past 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      players = await Promise.all(
        playersWithAverages.map(async (player, currentIndex) => {
          // Get Elo history for this player within the last 24 hours (across all events)
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

          let trend = 0;
          if (recentHistory.length > 0) {
            const totalRatingChange = recentHistory.reduce((total, entry) => {
              return total + (entry.newRating - entry.oldRating);
            }, 0);
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
            experience: player.experience || 0,
            rank: currentIndex + 1,
            trend: Math.round(trend),
            captainedTeams,
            team: teamInfo,
          };
        })
      );
    }

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}
