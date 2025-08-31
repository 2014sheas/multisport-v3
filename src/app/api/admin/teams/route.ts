import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam) : undefined;

    const teams = await prisma.team.findMany({
      where: year ? { year } : {},
      include: {
        members: {
          where: year ? { year } : {},
          include: {
            player: {
              select: {
                id: true,
                name: true,
                eloRating: true,
                experience: true,
                wins: true,
                eventRatings: {
                  where: year ? { event: { year } } : {},
                  select: {
                    rating: true,
                  },
                },
              },
            },
          },
        },
        captain: {
          select: {
            id: true,
            name: true,
            eloRating: true,
            experience: true,
            wins: true,
            eventRatings: {
              where: year ? { event: { year } } : {},
              select: {
                rating: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedTeams = teams.map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      abbreviation: team.abbreviation,
      year: team.year,
      captain: team.captain
        ? {
            id: team.captain.id,
            name: team.captain.name,
            eloRating:
              team.captain.eventRatings.length > 0
                ? Math.round(
                    team.captain.eventRatings.reduce(
                      (sum, er) => sum + er.rating,
                      0
                    ) / team.captain.eventRatings.length
                  )
                : team.captain.eloRating,
            experience: team.captain.experience,
            wins: team.captain.wins,
          }
        : null,
      members: team.members.map((member) => ({
        id: member.player.id,
        name: member.player.name,
        eloRating:
          member.player.eventRatings.length > 0
            ? Math.round(
                member.player.eventRatings.reduce(
                  (sum, er) => sum + er.rating,
                  0
                ) / member.player.eventRatings.length
              )
            : member.player.eloRating,
        experience: member.player.experience,
        wins: member.player.wins,
      })),
    }));

    return NextResponse.json({ teams: formattedTeams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    const { name, captainId, year } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    // Get the current active year if none specified
    let teamYear = year;
    if (!teamYear) {
      const activeYear = await prisma.year.findFirst({
        where: { isActive: true },
        select: { year: true },
      });
      teamYear = activeYear?.year || new Date().getFullYear();
    }

    const team = await prisma.team.create({
      data: {
        name,
        captainId: captainId || null,
        eloRating: 5000,
        year: teamYear,
      },
    });

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
