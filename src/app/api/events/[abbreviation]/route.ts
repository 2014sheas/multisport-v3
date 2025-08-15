import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ abbreviation: string }> }
) {
  const { abbreviation } = await params;
  try {
    const event = await prisma.event.findFirst({
      where: {
        abbreviation: abbreviation,
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
        duration: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}
