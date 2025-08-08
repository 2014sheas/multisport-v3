import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const updates = await request.json();

    // Handle team name update
    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        return NextResponse.json(
          { error: "Team name is required" },
          { status: 400 }
        );
      }

      const team = await prisma.team.update({
        where: { id },
        data: { name: updates.name.trim() },
      });

      return NextResponse.json({ team });
    }

    // Handle captain assignment
    if (updates.captainId !== undefined) {
      // Verify the captain is a player on this team
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: id,
          playerId: updates.captainId,
        },
      });

      if (!teamMember) {
        return NextResponse.json(
          { error: "Captain must be a player on this team" },
          { status: 400 }
        );
      }

      // Verify the player exists
      const player = await prisma.player.findUnique({
        where: { id: updates.captainId },
      });

      if (!player) {
        return NextResponse.json(
          { error: "Player not found" },
          { status: 400 }
        );
      }

      const team = await prisma.team.update({
        where: { id },
        data: { captainId: player.id },
      });

      return NextResponse.json({ team });
    }

    return NextResponse.json(
      { error: "No valid updates provided" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}
