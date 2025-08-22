import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  try {
    const player = await prisma.player.findFirst({
      where: {
        name: decodedName,
      },
      select: {
        id: true,
        name: true,
        experience: true,
        wins: true,
        eloRating: true,
        teamMembers: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                color: true,
                abbreviation: true,
              },
            },
          },
        },
        _count: {
          select: {
            eventRatings: true,
          },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Check if player is a captain
    const isCaptain = await prisma.team.findFirst({
      where: {
        captainId: player.id,
      },
      select: {
        id: true,
      },
    });

    // Calculate global rank for overall rating
    const allPlayers = await prisma.player.findMany({
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

    // Calculate overall ratings for all players (same logic as rankings page)
    const playersWithOverallRatings = allPlayers
      .map((p) => {
        let overallRating = 5000; // Default rating if no event ratings exist
        if (p.eventRatings.length > 0) {
          const totalRating = p.eventRatings.reduce(
            (sum, er) => sum + er.rating,
            0
          );
          overallRating = Math.round(totalRating / p.eventRatings.length);
        }
        return {
          id: p.id,
          rating: overallRating,
        };
      })
      .sort((a, b) => b.rating - a.rating);

    // Find this player's global rank
    const globalRank =
      playersWithOverallRatings.findIndex((p) => p.id === player.id) + 1;

    // Get the player's calculated overall rating
    const playerOverallRating =
      playersWithOverallRatings.find((p) => p.id === player.id)?.rating || 5000;

    // Get profile picture from linked user account
    const userWithProfilePicture = await prisma.user.findFirst({
      where: {
        playerId: player.id,
      },
      select: {
        image: true,
      },
    });

    // Format the response
    const formattedPlayer = {
      id: player.id,
      name: player.name,
      experience: player.experience || 0,
      wins: player.wins || 0,
      eloRating: playerOverallRating, // Use calculated overall rating
      globalRank: globalRank,
      profilePicture: userWithProfilePicture?.image || null,
      team: player.teamMembers.length > 0 ? player.teamMembers[0].team : null,
      isCaptain: !!isCaptain,
    };

    return NextResponse.json({ player: formattedPlayer });
  } catch (error) {
    console.error("Error fetching player:", error);
    return NextResponse.json(
      { error: "Failed to fetch player" },
      { status: 500 }
    );
  }
}
