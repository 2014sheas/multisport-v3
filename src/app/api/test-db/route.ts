import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test database connection
    const eventCount = await prisma.event.count();
    const events = await prisma.event.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        startTime: true,
        duration: true,
      },
    });

    return NextResponse.json({
      success: true,
      eventCount,
      sampleEvents: events,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
