import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const tournamentBracket = await prisma.tournamentBracket.findUnique({
      where: { eventId },
      include: {
        participants: {
          select: {
            id: true,
            teamId: true,
            seed: true,
            isEliminated: true,
            eliminationRound: true,
            finalPosition: true,
            team: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
                color: true,
              },
            },
          },
        },
        matches: {
          include: {
            team1: {
              include: {
                team: true,
              },
            },
            team2: {
              include: {
                team: true,
              },
            },
            // Include referenced matches to get their match numbers and teams
            team1FromMatch: {
              select: {
                matchNumber: true,
                team1: {
                  include: {
                    team: true,
                  },
                },
                team2: {
                  include: {
                    team: true,
                  },
                },
              },
            },
            team2FromMatch: {
              select: {
                matchNumber: true,
                team1: {
                  include: {
                    team: true,
                  },
                },
                team2: {
                  include: {
                    team: true,
                  },
                },
              },
            },
          },
          orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
        },
        winner: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!tournamentBracket) {
      return NextResponse.json(
        { error: "Tournament bracket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tournamentBracket);
  } catch (error) {
    console.error("Error fetching tournament bracket:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournament bracket" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { eventId } = await params;

    // Delete the tournament bracket and all related data
    await prisma.tournamentBracket.delete({
      where: { eventId },
    });

    return NextResponse.json({
      message: "Tournament bracket deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tournament bracket:", error);
    return NextResponse.json(
      { error: "Failed to delete tournament bracket" },
      { status: 500 }
    );
  }
}
