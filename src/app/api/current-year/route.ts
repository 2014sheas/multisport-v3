import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/current-year - Get the currently active year
export async function GET() {
  try {
    const activeYear = await prisma.year.findFirst({
      where: { isActive: true },
      select: { year: true, id: true },
    });

    if (!activeYear) {
      // If no active year is set, default to current year
      const currentYear = new Date().getFullYear();
      return NextResponse.json({ year: currentYear, id: null });
    }

    return NextResponse.json({ year: activeYear.year, id: activeYear.id });
  } catch (error) {
    console.error("Error fetching current year:", error);
    // Fallback to current year
    const currentYear = new Date().getFullYear();
    return NextResponse.json({ year: currentYear, id: null });
  }
}
