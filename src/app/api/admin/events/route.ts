import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam) : undefined;

    const events = await prisma.event.findMany({
      where: year ? { year } : {},
      orderBy: {
        startTime: "desc",
      },
      select: {
        id: true,
        name: true,
        abbreviation: true,
        symbol: true,
        eventType: true,
        status: true,
        startTime: true,
        duration: true,
        location: true,
        points: true,
        finalStandings: true,
        year: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

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

    const {
      name,
      abbreviation,
      symbol,
      eventType,
      status,
      startTime,
      location,
      points,
      finalStandings,
      duration,
      year,
    } = await request.json();

    if (!name || !abbreviation || !symbol || !eventType || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the current active year if none specified
    let eventYear = year;
    if (!eventYear) {
      const activeYear = await prisma.year.findFirst({
        where: { isActive: true },
        select: { year: true },
      });
      eventYear = activeYear?.year || new Date().getFullYear();
    }

    // Create the event and event ratings for all existing players in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the event
      const event = await tx.event.create({
        data: {
          name,
          abbreviation,
          symbol,
          eventType,
          status,
          startTime: startTime ? new Date(startTime) : null,
          location: location || null,
          points: points || [],
          finalStandings: finalStandings || null,
          duration: duration || null,
          year: eventYear,
        },
      });

      // Get all active players
      const players = await tx.player.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      // Create event ratings for all players with default rating of 5000
      if (players.length > 0) {
        const eventRatings = players.map((player) => ({
          playerId: player.id,
          eventId: event.id,
          rating: 5000,
        }));

        await tx.eventRating.createMany({
          data: eventRatings,
        });
      }

      return event;
    });

    return NextResponse.json({ event: result });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
