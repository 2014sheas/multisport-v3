import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ abbreviation: string }> }
) {
  const { abbreviation } = await params;
  try {
    // First, get the event to ensure it exists
    const event = await prisma.event.findFirst({
      where: {
        abbreviation: abbreviation,
      },
      select: {
        id: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get all teams with their members and event-specific ratings
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        abbreviation: true,
        color: true,
        members: {
          select: {
            player: {
              select: {
                id: true,
                name: true,
                eventRatings: {
                  where: {
                    eventId: event.id,
                  },
                  select: {
                    rating: true,
                    gamesPlayed: true,
                  },
                },
                eloHistory: {
                  where: {
                    eventId: event.id,
                    timestamp: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                    },
                  },
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
            },
          },
        },
      },
    });

    // Process teams to calculate averages and format data
    const processedTeams = teams
      .map((team) => {
        // Filter out teams with no members
        if (team.members.length === 0) return null;

        // Process team members and their ratings
        const processedMembers = team.members
          .map((member) => {
            const eventRating = member.player.eventRatings[0];
            if (!eventRating) return null;

            // Calculate 24h trend
            let trend = 0;
            const recentHistory = member.player.eloHistory;
            if (recentHistory.length > 0) {
              // Calculate net change: (final rating - initial rating) over 24h
              const initialRating = recentHistory[0].oldRating;
              const finalRating =
                recentHistory[recentHistory.length - 1].newRating;
              trend = Math.round(finalRating - initialRating);
            }

            return {
              playerId: member.player.id,
              playerName: member.player.name,
              rating: eventRating.rating,
              trend: trend,
              globalRank: 0, // Will be calculated below
            };
          })
          .filter(
            (member): member is NonNullable<typeof member> => member !== null
          );

        // Skip teams with no valid members
        if (processedMembers.length === 0) return null;

        // Calculate average rating
        const totalRating = processedMembers.reduce(
          (sum, member) => sum + member.rating,
          0
        );
        const averageRating = totalRating / processedMembers.length;

        // Calculate average team trend
        const totalTrend = processedMembers.reduce(
          (sum, member) => sum + member.trend,
          0
        );
        const averageTrend = Math.round(totalTrend / processedMembers.length);

        return {
          id: team.id,
          name: team.name,
          abbreviation: team.abbreviation,
          color: team.color,
          averageRating,
          averageTrend,
          memberCount: processedMembers.length,
          members: processedMembers.sort((a, b) => b.rating - a.rating), // Sort by rating descending
        };
      })
      .filter((team): team is NonNullable<typeof team> => team !== null);

    // Get global event rankings to determine player positions
    const globalEventRankings = await prisma.eventRating.findMany({
      where: {
        eventId: event.id,
      },
      select: {
        playerId: true,
        rating: true,
      },
      orderBy: {
        rating: "desc",
      },
    });

    // Create a map of player ID to global event rank
    const globalEventRankMap = new Map<string, number>();
    globalEventRankings.forEach((rating, index) => {
      globalEventRankMap.set(rating.playerId, index + 1);
    });

    // Add global rankings to all players
    processedTeams.forEach((team) => {
      team.members.forEach((member) => {
        member.globalRank = globalEventRankMap.get(member.playerId) || 0;
      });
    });

    // Sort teams by average rating descending
    processedTeams.sort((a, b) => b.averageRating - a.averageRating);

    return NextResponse.json({ teams: processedTeams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
