import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

// GET - Fetch a specific game
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            eventType: true,
            status: true,
          },
        },
        team1: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            color: true,
          },
        },
        team2: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            color: true,
          },
        },
        scorekeeper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error("Error fetching game:", error);
    return NextResponse.json(
      { error: "Failed to fetch game" },
      { status: 500 }
    );
  }
}

// PUT - Update a game (scorekeepers and admins only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user can modify this game
    const existingGame = await prisma.game.findUnique({
      where: { id },
      include: {
        scorekeeper: true,
      },
    });

    if (!existingGame) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Only the scorekeeper who created the game, or an admin, can modify it
    if (
      !session.user.isAdmin &&
      existingGame.scorekeeperId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You can only modify games you created" },
        { status: 403 }
      );
    }

    const {
      team1Id,
      team2Id,
      team1Score,
      team2Score,
      status,
      scheduledTime,
      location,
    } = await request.json();

    // Validate scores if provided
    if (
      team1Score !== undefined &&
      (team1Score < 0 || !Number.isInteger(team1Score))
    ) {
      return NextResponse.json(
        { error: "Team 1 score must be a non-negative integer" },
        { status: 400 }
      );
    }

    if (
      team2Score !== undefined &&
      (team2Score < 0 || !Number.isInteger(team2Score))
    ) {
      return NextResponse.json(
        { error: "Team 2 score must be a non-negative integer" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (team1Id !== undefined) updateData.team1Id = team1Id;
    if (team2Id !== undefined) updateData.team2Id = team2Id;
    if (team1Score !== undefined) updateData.team1Score = team1Score;
    if (team2Score !== undefined) updateData.team2Score = team2Score;
    if (status !== undefined) updateData.status = status;
    if (scheduledTime !== undefined)
      updateData.scheduledTime = scheduledTime ? new Date(scheduledTime) : null;
    if (location !== undefined) updateData.location = location;

    // If completing the game, set completedAt timestamp
    if (status === "COMPLETED" && existingGame.status !== "COMPLETED") {
      updateData.completedAt = new Date();
    }

    // Update the game
    const updatedGame = await prisma.game.update({
      where: { id },
      data: updateData,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            eventType: true,
            status: true,
          },
        },
        team1: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            color: true,
          },
        },
        team2: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            color: true,
          },
        },
        scorekeeper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ game: updatedGame });
  } catch (error) {
    console.error("Error updating game:", error);
    return NextResponse.json(
      { error: "Failed to update game" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a game (admins only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    await prisma.game.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Game deleted successfully" });
  } catch (error) {
    console.error("Error deleting game:", error);
    return NextResponse.json(
      { error: "Failed to delete game" },
      { status: 500 }
    );
  }
}
