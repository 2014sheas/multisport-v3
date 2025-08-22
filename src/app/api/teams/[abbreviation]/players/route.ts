import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ abbreviation: string }> }
) {
  const { abbreviation } = await params;
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  try {
    // First, get the team to ensure it exists
    const team = await prisma.team.findFirst({
      where: {
        abbreviation: abbreviation,
      },
      select: {
        id: true,
        captainId: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    let players;

    if (eventId) {
      // Get event-specific rankings for the team
      const teamMembers = await prisma.teamMember.findMany({
        where: {
          teamId: team.id,
        },
        select: {
          player: {
            select: {
              id: true,
              name: true,
              experience: true,
              eventRatings: {
                where: {
                  eventId: eventId,
                },
                select: {
                  rating: true,
                  gamesPlayed: true,
                },
              },
              eloHistory: {
                where: {
                  eventId: eventId,
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
      });

      // Process players with event-specific data
      const processedPlayers = teamMembers
        .map((member) => {
          const eventRating = member.player.eventRatings[0];
          if (!eventRating) return null;

          // Calculate 24h trend
          let trend = 0;
          const recentHistory = member.player.eloHistory;
          if (recentHistory.length > 0) {
            const initialRating = recentHistory[0].oldRating;
            const finalRating =
              recentHistory[recentHistory.length - 1].newRating;
            trend = Math.round(finalRating - initialRating);
          }

          return {
            id: member.player.id,
            name: member.player.name,
            rating: eventRating.rating,
            trend: trend,
            experience: member.player.experience,
            isCaptain: false, // Will be updated below
          };
        })
        .filter(
          (player): player is NonNullable<typeof player> => player !== null
        )
        .sort((a, b) => b.rating - a.rating); // Sort by rating descending

      // Get global rankings for this specific event to determine overall player pool position
      const globalEventRankings = await prisma.eventRating.findMany({
        where: {
          eventId: eventId,
        },
        select: {
          playerId: true,
          rating: true,
        },
        orderBy: {
          rating: "desc",
        },
      });

      // Fetch profile pictures for all players
      const playerIds = processedPlayers.map((player) => player.id);
      const userProfilePictures = await prisma.user.findMany({
        where: {
          playerId: { in: playerIds },
        },
        select: {
          playerId: true,
          image: true,
        },
      });

      // Create a map for quick lookup
      const profilePictureMap = new Map<string, string | null>();
      userProfilePictures.forEach((user) => {
        if (user.playerId) {
          profilePictureMap.set(user.playerId, user.image);
        }
      });

      // Create a map of player ID to global event rank
      const globalEventRankMap = new Map<string, number>();
      globalEventRankings.forEach((rating, index) => {
        globalEventRankMap.set(rating.playerId, index + 1);
      });

      // Add global event rank, captain status, and profile pictures
      players = processedPlayers.map((player) => ({
        ...player,
        rank: globalEventRankMap.get(player.id) || 0,
        isCaptain: player.id === team.captainId,
        profilePicture: profilePictureMap.get(player.id) || null,
      }));
    } else {
      // Get overall rankings for the team - calculate same way as rankings page
      const teamMembers = await prisma.teamMember.findMany({
        where: {
          teamId: team.id,
        },
        select: {
          player: {
            select: {
              id: true,
              name: true,
              experience: true,
              eventRatings: {
                select: {
                  rating: true,
                },
              },
              eloHistory: {
                where: {
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
      });

      // Process players with overall data - same logic as rankings page
      const processedPlayers = teamMembers
        .map((member) => {
          // Calculate overall rating using average of event ratings (same as rankings page)
          let overallRating = 5000; // Default rating if no event ratings exist
          if (member.player.eventRatings.length > 0) {
            const totalRating = member.player.eventRatings.reduce(
              (sum, er) => sum + er.rating,
              0
            );
            overallRating = Math.round(
              totalRating / member.player.eventRatings.length
            );
          }

          // Calculate 24h trend
          let trend = 0;
          const recentHistory = member.player.eloHistory;
          if (recentHistory.length > 0) {
            const initialRating = recentHistory[0].oldRating;
            const finalRating =
              recentHistory[recentHistory.length - 1].newRating;
            // Since we're calculating overall rating as average of event ratings,
            // we need to divide the trend by the total number of events to get
            // the proper overall trend
            const totalEvents = member.player.eventRatings.length;
            const rawTrend = finalRating - initialRating;
            trend = totalEvents > 0 ? Math.round(rawTrend / totalEvents) : 0;
          }

          return {
            id: member.player.id,
            name: member.player.name,
            rating: overallRating,
            trend: trend,
            experience: member.player.experience,
            isCaptain: false, // Will be updated below
          };
        })
        .sort((a, b) => b.rating - a.rating); // Sort by rating descending

      // Get global rankings to determine overall player pool position
      const globalRankings = await prisma.player.findMany({
        select: {
          id: true,
          eventRatings: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: {
          id: "asc", // Consistent ordering for ranking calculation
        },
      });

      // Fetch profile pictures for all players
      const playerIds = processedPlayers.map((player) => player.id);
      const userProfilePictures = await prisma.user.findMany({
        where: {
          playerId: { in: playerIds },
        },
        select: {
          playerId: true,
          image: true,
        },
      });

      // Create a map for quick lookup
      const profilePictureMap = new Map<string, string | null>();
      userProfilePictures.forEach((user) => {
        if (user.playerId) {
          profilePictureMap.set(user.playerId, user.image);
        }
      });

      // Calculate global rankings
      const globalPlayersWithRatings = globalRankings
        .map((player) => {
          let overallRating = 5000;
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
            id: player.id,
            rating: overallRating,
          };
        })
        .sort((a, b) => b.rating - a.rating);

      // Create a map of player ID to global rank
      const globalRankMap = new Map<string, number>();
      globalPlayersWithRatings.forEach((player, index) => {
        globalRankMap.set(player.id, index + 1);
      });

      // Add global rank, captain status, and profile pictures
      players = processedPlayers.map((player) => ({
        ...player,
        rank: globalRankMap.get(player.id) || 0,
        isCaptain: player.id === team.captainId,
        profilePicture: profilePictureMap.get(player.id) || null,
      }));
    }

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error fetching team players:", error);
    return NextResponse.json(
      { error: "Failed to fetch team players" },
      { status: 500 }
    );
  }
}
