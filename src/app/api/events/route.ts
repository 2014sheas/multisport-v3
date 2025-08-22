import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
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
      orderBy: {
        startTime: "asc",
      },
    });

    const response = NextResponse.json({ events });

    // Cache for 30 seconds to reduce database load
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );

    return response;
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
