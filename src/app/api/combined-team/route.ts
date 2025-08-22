import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

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

    const { eventId, combinedTeams, currentScore, status } = await request.json();

    if (!eventId || !combinedTeams) {
      return NextResponse.json(
        { error: "Event ID and combined teams data are required" },
        { status: 400 }
      );
    }

    // Prepare the data to store
    const combinedTeamData = {
      teams: combinedTeams,
      currentScore: currentScore || [0, 0],
      lastUpdated: new Date().toISOString(),
    };

    // Store the combined team data in the dedicated combinedTeamData field
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        combinedTeamData: combinedTeamData,
        // If status is provided and it's "COMPLETED", update the event status
        ...(status === "COMPLETED" && { status: "COMPLETED" }),
      },
    });

    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error("Error saving combined team data:", error);
    return NextResponse.json(
      { error: "Failed to save combined team data" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        eventType: true,
        combinedTeamData: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.eventType !== "COMBINED_TEAM") {
      return NextResponse.json(
        { error: "Event is not a combined team event" },
        { status: 400 }
      );
    }

    return NextResponse.json({ combinedTeams: event.combinedTeamData });
  } catch (error) {
    console.error("Error fetching combined team data:", error);
    return NextResponse.json(
      { error: "Failed to fetch combined team data" },
      { status: 500 }
    );
  }
}
