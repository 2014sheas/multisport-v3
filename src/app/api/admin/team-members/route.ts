import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

// POST /api/admin/team-members - Assign a player to a team for a specific year
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

    const { teamId, playerId, year } = await request.json();

    if (!teamId || !playerId) {
      return NextResponse.json(
        { error: "Team ID and Player ID are required" },
        { status: 400 }
      );
    }

    // Get the current active year if none specified
    let assignmentYear = year;
    if (!assignmentYear) {
      const activeYear = await prisma.year.findFirst({
        where: { isActive: true },
        select: { year: true },
      });
      assignmentYear = activeYear?.year || new Date().getFullYear();
    }

    // Check if the team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if the player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Check if the player is already on this team for this year
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        playerId,
        year: assignmentYear,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "Player is already on this team for this year" },
        { status: 400 }
      );
    }

    // Create the team membership
    const teamMember = await prisma.teamMember.create({
      data: {
        teamId,
        playerId,
        year: assignmentYear,
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            eloRating: true,
            experience: true,
            wins: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
      },
    });

    return NextResponse.json({ teamMember });
  } catch (error) {
    console.error("Error assigning player to team:", error);
    return NextResponse.json(
      { error: "Failed to assign player to team" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/team-members - Remove a player from a team for a specific year
export async function DELETE(request: NextRequest) {
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
    const teamId = searchParams.get("teamId");
    const playerId = searchParams.get("playerId");
    const year = searchParams.get("year");

    if (!teamId || !playerId) {
      return NextResponse.json(
        { error: "Team ID and Player ID are required" },
        { status: 400 }
      );
    }

    // Get the current active year if none specified
    let removalYear = year ? parseInt(year) : undefined;
    if (!removalYear) {
      const activeYear = await prisma.year.findFirst({
        where: { isActive: true },
        select: { year: true },
      });
      removalYear = activeYear?.year || new Date().getFullYear();
    }

    // Check if the team membership exists
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        playerId,
        year: removalYear,
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "Player is not on this team for this year" },
        { status: 404 }
      );
    }

    // Remove the team membership
    await prisma.teamMember.delete({
      where: {
        teamId_playerId: {
          teamId,
          playerId,
        },
      },
    });

    return NextResponse.json({
      message: "Player removed from team successfully",
    });
  } catch (error) {
    console.error("Error removing player from team:", error);
    return NextResponse.json(
      { error: "Failed to remove player from team" },
      { status: 500 }
    );
  }
}
