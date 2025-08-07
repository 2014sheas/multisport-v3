import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // For now, we'll store draft time in a simple settings table
    // You can expand this to a proper settings system later
    const draftSetting = await prisma.setting.findUnique({
      where: { key: "draft_time" },
    });

    return NextResponse.json({
      draftTime: draftSetting?.value || null,
    });
  } catch (error) {
    console.error("Error fetching draft time:", error);
    return NextResponse.json(
      { error: "Failed to fetch draft time" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { draftTime } = await request.json();

    if (!draftTime) {
      return NextResponse.json(
        { error: "Draft time is required" },
        { status: 400 }
      );
    }

    // Upsert the draft time setting
    const setting = await prisma.setting.upsert({
      where: { key: "draft_time" },
      update: { value: draftTime },
      create: {
        key: "draft_time",
        value: draftTime,
      },
    });

    return NextResponse.json({ setting });
  } catch (error) {
    console.error("Error updating draft time:", error);
    return NextResponse.json(
      { error: "Failed to update draft time" },
      { status: 500 }
    );
  }
}
