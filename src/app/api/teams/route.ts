import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                eloRating: true,
              },
            },
          },
        },
        captain: {
          select: {
            id: true,
            name: true,
            eloRating: true,
          },
        },
      },
    });

    const formattedTeams = teams.map((team) => ({
      id: team.id,
      name: team.name,
      color: "#3B82F6", // Default blue color
      captain: team.captain
        ? {
            id: team.captain.id,
            name: team.captain.name,
            rating: team.captain.eloRating,
          }
        : null,
      members: team.members.map((member) => ({
        id: member.player.id,
        name: member.player.name,
        rating: member.player.eloRating,
      })),
    }));

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
