import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        captainId: true,
        color: true,
        abbreviation: true,
      },
    });

    const formattedTeams = await Promise.all(
      teams.map(async (team) => {
        // Get team members
        const members = await prisma.teamMember.findMany({
          where: { teamId: team.id },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                eloRating: true,
              },
            },
          },
        });

        // Get captain if exists
        const captain = team.captainId
          ? await prisma.player.findUnique({
              where: { id: team.captainId },
              select: {
                id: true,
                name: true,
                eloRating: true,
              },
            })
          : null;

        // Calculate average player rating using the same logic as rankings page
        const allPlayers = [
          ...members.map((member) => member.player),
          ...(captain ? [captain] : []),
        ];

        // Get event ratings for all players to calculate avg_event_rating
        const playerIds = allPlayers.map((p) => p.id);
        const eventRatings = await prisma.eventRating.findMany({
          where: {
            playerId: { in: playerIds },
          },
          select: {
            playerId: true,
            rating: true,
          },
        });

        // Calculate avg_event_rating for each player (same as materialized view)
        const playerRatings = allPlayers.map((player) => {
          const playerEventRatings = eventRatings.filter(
            (er) => er.playerId === player.id
          );
          if (playerEventRatings.length > 0) {
            // Use average of event ratings (same as avg_event_rating)
            const avgEventRating = Math.round(
              playerEventRatings.reduce((sum, er) => sum + er.rating, 0) /
                playerEventRatings.length
            );
            return avgEventRating;
          } else {
            // Fallback to base eloRating (same as materialized view)
            return player.eloRating;
          }
        });

        const averageRating =
          playerRatings.length > 0
            ? Math.round(
                playerRatings.reduce((sum, rating) => sum + rating, 0) /
                  playerRatings.length
              )
            : 0;

        // Calculate individual player ratings using the same logic
        const memberRatings = members.map((member) => {
          const playerEventRatings = eventRatings.filter(
            (er) => er.playerId === member.player.id
          );
          if (playerEventRatings.length > 0) {
            const avgEventRating = Math.round(
              playerEventRatings.reduce((sum, er) => sum + er.rating, 0) /
                playerEventRatings.length
            );
            return {
              id: member.player.id,
              name: member.player.name,
              rating: avgEventRating,
            };
          } else {
            return {
              id: member.player.id,
              name: member.player.name,
              rating: member.player.eloRating,
            };
          }
        });

        const captainRating = captain
          ? (() => {
              const playerEventRatings = eventRatings.filter(
                (er) => er.playerId === captain.id
              );
              if (playerEventRatings.length > 0) {
                const avgEventRating = Math.round(
                  playerEventRatings.reduce((sum, er) => sum + er.rating, 0) /
                    playerEventRatings.length
                );
                return avgEventRating;
              } else {
                return captain.eloRating;
              }
            })()
          : null;

        return {
          id: team.id,
          name: team.name,
          abbreviation: team.abbreviation,
          color: team.color,
          averageRating,
          captain: captain
            ? {
                id: captain.id,
                name: captain.name,
                rating: captainRating,
              }
            : null,
          members: memberRatings,
        };
      })
    );

    return NextResponse.json({
      teams: formattedTeams,
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
