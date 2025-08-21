import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: RouteContext) {
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
    const updateData = await request.json();

    // First, get the existing event to merge with updates
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Prepare the data to update, merging with existing values
    const data: Record<string, unknown> = {};

    // Handle required fields - use existing values if not provided
    if (updateData.name !== undefined) data.name = updateData.name;
    else data.name = existingEvent.name;

    if (updateData.abbreviation !== undefined)
      data.abbreviation = updateData.abbreviation;
    else data.abbreviation = existingEvent.abbreviation;

    if (updateData.symbol !== undefined) data.symbol = updateData.symbol;
    else data.symbol = existingEvent.symbol;

    if (updateData.eventType !== undefined)
      data.eventType = updateData.eventType;
    else data.eventType = existingEvent.eventType;

    if (updateData.status !== undefined) data.status = updateData.status;
    else data.status = existingEvent.status;

    if (updateData.startTime !== undefined)
      data.startTime = new Date(updateData.startTime);
    else data.startTime = existingEvent.startTime;

    if (updateData.duration !== undefined) data.duration = updateData.duration;
    else data.duration = existingEvent.duration;

    if (updateData.location !== undefined) data.location = updateData.location;
    else data.location = existingEvent.location;

    if (updateData.points !== undefined) data.points = updateData.points;
    else data.points = existingEvent.points;

    if (updateData.finalStandings !== undefined)
      data.finalStandings = updateData.finalStandings;
    else data.finalStandings = existingEvent.finalStandings;

    const event = await prisma.event.update({
      where: { id },
      data,
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
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

    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
