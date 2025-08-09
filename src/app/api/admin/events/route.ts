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

    const events = await prisma.event.findMany({
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
        location: true,
        points: true,
        finalStandings: true,
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
    } = await request.json();

    if (!name || !abbreviation || !symbol || !eventType || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
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
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
