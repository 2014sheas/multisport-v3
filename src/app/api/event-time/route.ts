import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get event time from settings table
    const eventSetting = await prisma.setting.findUnique({
      where: { key: "event_time" },
    });

    return NextResponse.json({
      eventTime: eventSetting?.value || null,
    });
  } catch (error) {
    console.error("Error fetching event time:", error);
    return NextResponse.json(
      { error: "Failed to fetch event time" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { eventTime } = await request.json();

    if (!eventTime) {
      return NextResponse.json(
        { error: "Event time is required" },
        { status: 400 }
      );
    }

    // Upsert the event time setting
    const setting = await prisma.setting.upsert({
      where: { key: "event_time" },
      update: { value: eventTime },
      create: {
        key: "event_time",
        value: eventTime,
      },
    });

    return NextResponse.json({ setting });
  } catch (error) {
    console.error("Error updating event time:", error);
    return NextResponse.json(
      { error: "Failed to update event time" },
      { status: 500 }
    );
  }
}
