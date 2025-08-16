import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ abbreviation: string }> }
) {
  const { abbreviation } = await params;

  try {
    const team = await prisma.team.findFirst({
      where: {
        abbreviation: abbreviation,
      },
      select: {
        id: true,
        name: true,
        abbreviation: true,
        color: true,
        captainId: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}
