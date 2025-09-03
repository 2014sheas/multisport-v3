import { NextResponse } from "next/server";
import { OptimizedQueries } from "@/lib/database";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async () => {
  // Use the optimized query that centralizes all rating calculations
  const teams = await OptimizedQueries.getTeamsWithAverageRatings({
    includeTrend: false,
  });

  return { teams };
}, "/api/teams");
