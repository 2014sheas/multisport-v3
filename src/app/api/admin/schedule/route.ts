import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth-config";
import { prisma } from "../../../../lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    // Check authentication and admin status
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { events } = await request.json();

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: "Invalid events data" },
        { status: 400 }
      );
    }

    // Update each event with its new schedule
    const updatePromises = events.map(async (event) => {
      if (event.startTime) {
        return prisma.event.update({
          where: { id: event.id },
          data: {
            startTime: new Date(event.startTime),
            duration: event.duration || 60, // Default to 60 minutes if not specified
            updatedAt: new Date(),
          },
        });
      }
      return null;
    });

    const results = await Promise.all(updatePromises);
    const updatedEvents = results.filter(Boolean);

    return NextResponse.json({
      message: "Schedule updated successfully",
      updatedEvents,
    });
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check authentication and admin status
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all events with their schedules
    const events = await prisma.event.findMany({
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
