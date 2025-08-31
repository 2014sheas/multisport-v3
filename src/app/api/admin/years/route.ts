import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

// GET /api/admin/years - Get all years
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const years = await prisma.year.findMany({
      orderBy: { year: "desc" },
    });

    return NextResponse.json({ years });
  } catch (error) {
    console.error("Error fetching years:", error);
    return NextResponse.json(
      { error: "Failed to fetch years" },
      { status: 500 }
    );
  }
}

// POST /api/admin/years - Create a new year
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { year, description, isActive } = await request.json();

    if (!year || typeof year !== "number") {
      return NextResponse.json(
        { error: "Year is required and must be a number" },
        { status: 400 }
      );
    }

    // If setting this year as active, deactivate all other years
    if (isActive) {
      await prisma.year.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const newYear = await prisma.year.create({
      data: {
        year,
        description,
        isActive: isActive || false,
      },
    });

    return NextResponse.json({ year: newYear });
  } catch (error) {
    console.error("Error creating year:", error);
    return NextResponse.json(
      { error: "Failed to create year" },
      { status: 500 }
    );
  }
}
