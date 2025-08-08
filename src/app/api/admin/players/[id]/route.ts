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

    // Handle team assignment separately
    if (updates.teamId !== undefined) {
      // Remove existing team membership
      await prisma.teamMember.deleteMany({
        where: { playerId: id },
      });

      // Add new team membership if teamId is provided
      if (updates.teamId) {
        await prisma.teamMember.create({
          data: {
            playerId: id,
            teamId: updates.teamId,
          },
        });
      }

      // Remove teamId from updates since we handled it separately
      delete updates.teamId;
    }

    // Update other player fields
    const player = await prisma.player.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ player });
  } catch (error) {
    console.error("Error updating player:", error);
    return NextResponse.json(
      { error: "Failed to update player" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.player.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting player:", error);
    return NextResponse.json(
      { error: "Failed to delete player" },
      { status: 500 }
    );
  }
}
