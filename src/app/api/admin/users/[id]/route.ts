import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const updates = await request.json();

    // Handle team assignment separately
    if (updates.teamId !== undefined) {
      // Get the user's player record
      const user = await prisma.user.findUnique({
        where: { id },
        include: { player: true },
      });

      if (user?.player) {
        // Remove existing team membership
        await prisma.teamMember.deleteMany({
          where: { playerId: user.player.id },
        });

        // Add new team membership if teamId is provided
        if (updates.teamId) {
          await prisma.teamMember.create({
            data: {
              playerId: user.player.id,
              teamId: updates.teamId,
            },
          });
        }
      }

      // Remove teamId from updates since we handled it separately
      delete updates.teamId;
    }

    // Handle player linking separately
    if (updates.playerId !== undefined) {
      console.log(`Linking user ${id} to player ${updates.playerId}`);

      // Remove existing player link if setting to null
      if (updates.playerId === null) {
        await prisma.user.update({
          where: { id },
          data: { playerId: null },
        });
        console.log(`Unlinked user ${id} from player`);
      } else {
        // Link to new player
        await prisma.user.update({
          where: { id },
          data: { playerId: updates.playerId },
        });
        console.log(`Linked user ${id} to player ${updates.playerId}`);
      }

      // Remove playerId from updates since we handled it separately
      delete updates.playerId;
    }

    // Update other user fields
    const user = await prisma.user.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
