import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

// PUT /api/admin/years/[id] - Update a year
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { year, description, isActive } = await request.json();

    // If setting this year as active, deactivate all other years
    if (isActive) {
      await prisma.year.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
    }

    const updatedYear = await prisma.year.update({
      where: { id },
      data: {
        year: year ? parseInt(year) : undefined,
        description,
        isActive
      }
    });

    return NextResponse.json({ year: updatedYear });
  } catch (error) {
    console.error("Error updating year:", error);
    return NextResponse.json(
      { error: "Failed to update year" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/years/[id] - Delete a year
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if this year is currently active
    const yearToDelete = await prisma.year.findUnique({
      where: { id }
    });

    if (yearToDelete?.isActive) {
      return NextResponse.json(
        { error: "Cannot delete the currently active year" },
        { status: 400 }
      );
    }

    // Check if there are any teams, events, or games using this year
    const [teamsCount, eventsCount, gamesCount] = await Promise.all([
      prisma.team.count({ where: { year: yearToDelete?.year } }),
      prisma.event.count({ where: { year: yearToDelete?.year } }),
      prisma.game.count({ where: { year: yearToDelete?.year } })
    ]);

    if (teamsCount > 0 || eventsCount > 0 || gamesCount > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete year - it contains teams, events, or games. Delete those first or move them to another year." 
        },
        { status: 400 }
      );
    }

    await prisma.year.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Year deleted successfully" });
  } catch (error) {
    console.error("Error deleting year:", error);
    return NextResponse.json(
      { error: "Failed to delete year" },
      { status: 500 }
    );
  }
}
