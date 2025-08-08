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

        // Calculate average player rating
        const allPlayers = [
          ...members.map((member) => member.player),
          ...(captain ? [captain] : []),
        ];

        const averageRating =
          allPlayers.length > 0
            ? Math.round(
                allPlayers.reduce((sum, player) => sum + player.eloRating, 0) /
                  allPlayers.length
              )
            : 0;

        return {
          id: team.id,
          name: team.name,
          color: team.color, // Use the color from the database
          averageRating,
          captain: captain
            ? {
                id: captain.id,
                name: captain.name,
                rating: captain.eloRating,
              }
            : null,
          members: members.map((member) => ({
            id: member.player.id,
            name: member.player.name,
            rating: member.player.eloRating,
          })),
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
