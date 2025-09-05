import { NextRequest, NextResponse } from "next/server";
import { OptimizedQueries } from "@/lib/database";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  // Use the optimized query that centralizes all rating calculations
  const teams = await OptimizedQueries.getTeamsWithAverageRatings({
    includeTrend: false,
    year: year ? parseInt(year) : undefined,
  });

  return { teams };
}, "/api/teams");
