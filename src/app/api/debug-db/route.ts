import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("🔍 Debug: Checking database connection...");

    // Check environment variables
    const envInfo = {
      DATABASE_URL: process.env.DATABASE_URL,
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
      NODE_ENV: process.env.NODE_ENV,
    };

    // Check database connection info (simplified)
    const dbInfo = await prisma.$queryRawUnsafe<
      [
        {
          database_name: string;
          schema_name: string;
          user_name: string;
        }
      ]
    >(`
      SELECT 
        current_database() as database_name,
        current_schema() as schema_name,
        current_user as user_name
    `);

    // Check if materialized view exists
    const viewExists = await prisma.$queryRawUnsafe<
      [
        {
          schemaname: string;
          matviewname: string;
        }
      ]
    >(`
      SELECT schemaname, matviewname 
      FROM pg_matviews 
      WHERE matviewname = 'player_rankings_mv';
    `);

    // Check player count
    const playerCount = await prisma.player.count();

    // Try to query the materialized view
    let mvQueryResult = null;
    let mvQueryError = null;

    try {
      const mvResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
        SELECT COUNT(*) as count FROM player_rankings_mv;
      `);
      mvQueryResult = { count: Number(mvResult[0].count) };
    } catch (error) {
      mvQueryError = error instanceof Error ? error.message : String(error);
    }

    const debugInfo = {
      environment: envInfo,
      database: {
        name: dbInfo[0].database_name,
        schema: dbInfo[0].schema_name,
        user: dbInfo[0].user_name,
      },
      materializedView: {
        exists: viewExists.length > 0,
        details: viewExists[0]
          ? {
              schema: viewExists[0].schemaname,
              name: viewExists[0].matviewname,
            }
          : null,
        queryable: mvQueryError === null,
        queryResult: mvQueryResult,
        queryError: mvQueryError,
      },
      playerCount,
    };

    console.log("🔍 Debug info:", debugInfo);

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error("❌ Debug error:", error);
    return NextResponse.json(
      {
        error: "Debug failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
