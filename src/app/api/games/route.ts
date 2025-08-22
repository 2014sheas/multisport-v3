import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

// GET - Fetch all games (scorekeepers and admins only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin && !session.user.isScorekeeper) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;

    const games = await prisma.game.findMany({
      where,
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
      orderBy: [{ scheduledTime: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ games });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}

// POST - Create a new game (scorekeepers and admins only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin && !session.user.isScorekeeper) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { eventId, team1Id, team2Id, scheduledTime, location } =
      await request.json();

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Verify the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Create the game
    const game = await prisma.game.create({
      data: {
        eventId,
        team1Id: team1Id || null,
        team2Id: team2Id || null,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        location: location || null,
        scorekeeperId: session.user.id,
        status: "SCHEDULED",
      },
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

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}
