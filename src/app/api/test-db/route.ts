import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;

    // Test a simple query
    const userCount = await prisma.user.count();

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      data: {
        testQuery: result,
        userCount,
        postgresPrismaUrl: process.env.POSTGRES_PRISMA_URL ? "Set" : "Not set",
        databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set",
        nodeEnv: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    console.error("Database connection test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          postgresPrismaUrl: process.env.POSTGRES_PRISMA_URL ? "Set" : "Not set",
          databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set",
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 500 }
    );
  }
}
