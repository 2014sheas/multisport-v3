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
          include: {
            team: true,
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
          },
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
