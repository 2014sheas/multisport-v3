import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const count = searchParams.get("count") || "3";
    const excludeIds = searchParams.get("excludeIds"); // Comma-separated IDs to exclude

    const playerCount = parseInt(count);
    const excludePlayerIds = excludeIds ? excludeIds.split(",") : [];

    // Get the current active year
    const currentYear = await prisma.year.findFirst({
      where: { isActive: true },
      select: { year: true },
    });
    const activeYear = currentYear?.year || new Date().getFullYear();

    // Get the total count of active players
    const totalActivePlayers = await prisma.player.count({
      where: { isActive: true },
    });

    if (totalActivePlayers < playerCount) {
      // If we have fewer than requested players, return all of them
      const players = await prisma.player.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          eloRating: true,
          experience: true,
        },
      });

      return NextResponse.json({
        players,
        message: `Only ${players.length} players available`,
      });
    }

    let players: Array<{
      id: string;
      name: string;
      eloRating: number;
      experience: number;
      team?: {
        id: string;
        name: string;
        color: string;
        abbreviation?: string;
      } | null;
    }> = [];

    if (eventId) {
      // Get random players with event-specific ratings using improved random selection
      const excludeClause =
        excludePlayerIds.length > 0
          ? `AND p.id NOT IN (${excludePlayerIds
              .map((id) => `'${id}'`)
              .join(",")})`
          : "";

      // First, get the total count of available players after exclusions
      const availableCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `
        SELECT COUNT(*) as count
        FROM players p
        LEFT JOIN event_ratings er ON p.id = er."playerId" AND er."eventId" = $1
        WHERE p."isActive" = true
        ${excludeClause}
      `,
        eventId
      );

      const totalAvailable = Number(availableCount[0].count);

      if (totalAvailable < playerCount) {
        // If not enough players available, return all available players
        const allAvailable = await prisma.$queryRawUnsafe<
          Array<{
            id: string;
            name: string;
            eloRating: number;
            experience: number;
            team?: {
              id: string;
              name: string;
              color: string;
              abbreviation?: string;
            } | null;
          }>
        >(
          `
          SELECT 
            p.id, 
            p.name, 
            p.experience,
            COALESCE(er.rating, p."eloRating") as "eloRating",
            t.id as "teamId",
            t.name as "teamName",
            t.color as "teamColor",
            t.abbreviation as "teamAbbreviation"
          FROM players p
          LEFT JOIN event_ratings er ON p.id = er."playerId" AND er."eventId" = $1
          LEFT JOIN team_members tm ON p.id = tm."playerId" AND tm.year = ${activeYear}
          LEFT JOIN teams t ON tm."teamId" = t.id AND t.year = ${activeYear}
          WHERE p."isActive" = true
          ${excludeClause}
          ORDER BY RANDOM()
        `,
          eventId
        );

        players = allAvailable;
      } else {
        // Use improved random selection for better distribution
        const eventRatings = await prisma.$queryRawUnsafe<
          Array<{
            id: string;
            name: string;
            eloRating: number;
            experience: number;
            team?: {
              id: string;
              name: string;
              color: string;
              abbreviation?: string;
            } | null;
          }>
        >(
          `
          SELECT 
            p.id, 
            p.name, 
            p.experience,
            COALESCE(er.rating, p."eloRating") as "eloRating",
            t.id as "teamId",
            t.name as "teamName",
            t.color as "teamColor",
            t.abbreviation as "teamAbbreviation"
          FROM players p
          LEFT JOIN event_ratings er ON p.id = er."playerId" AND er."eventId" = $1
          LEFT JOIN team_members tm ON p.id = tm."playerId" AND tm.year = ${activeYear}
          LEFT JOIN teams t ON tm."teamId" = t.id AND t.year = ${activeYear}
          WHERE p."isActive" = true
          ${excludeClause}
          ORDER BY RANDOM()
          LIMIT $2
        `,
          eventId,
          playerCount
        );

        players = eventRatings;
      }
    } else {
      // Get random players using overall ratings with improved random selection
      const excludeClause =
        excludePlayerIds.length > 0
          ? `AND p.id NOT IN (${excludePlayerIds
              .map((id) => `'${id}'`)
              .join(",")})`
          : "";

      // First, get the total count of available players after exclusions
      const availableCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
        SELECT COUNT(*) as count
        FROM players 
        WHERE "isActive" = true
        ${excludeClause}
      `);

      const totalAvailable = Number(availableCount[0].count);

      if (totalAvailable < playerCount) {
        // If not enough players available, return all available players
        const allAvailable = await prisma.$queryRawUnsafe<
          Array<{
            id: string;
            name: string;
            eloRating: number;
            experience: number;
            team?: {
              id: string;
              name: string;
              color: string;
              abbreviation?: string;
            } | null;
          }>
        >(`
          SELECT 
            p.id, 
            p.name, 
            p."eloRating", 
            p.experience,
            t.id as "teamId",
            t.name as "teamName",
            t.color as "teamColor",
            t.abbreviation as "teamAbbreviation"
          FROM players p
          LEFT JOIN team_members tm ON p.id = tm."playerId" AND tm.year = ${activeYear}
          LEFT JOIN teams t ON tm."teamId" = t.id AND t.year = ${activeYear}
          WHERE p."isActive" = true
          ${excludeClause}
          ORDER BY RANDOM()
        `);

        players = allAvailable;
      } else {
        // Use simple random selection for better distribution
        const randomPlayers = await prisma.$queryRawUnsafe<
          Array<{
            id: string;
            name: string;
            eloRating: number;
            experience: number;
            team?: {
              id: string;
              name: string;
              color: string;
              abbreviation?: string;
            } | null;
          }>
        >(
          `
          SELECT 
            p.id, 
            p.name, 
            p."eloRating", 
            p.experience,
            t.id as "teamId",
            t.name as "teamName",
            t.color as "teamColor",
            t.abbreviation as "teamAbbreviation"
          FROM players p
          LEFT JOIN team_members tm ON p.id = tm."playerId" AND tm.year = ${activeYear}
          LEFT JOIN teams t ON tm."teamId" = t.id AND t.year = ${activeYear}
          WHERE p."isActive" = true
          ${excludeClause}
          ORDER BY RANDOM()
          LIMIT $1
        `,
          playerCount
        );

        players = randomPlayers;
      }
    }

    // Transform the raw SQL results to include properly formatted team data
    const transformedPlayers = players.map(
      (player: {
        id: string;
        name: string;
        eloRating: number;
        experience: number;
        teamId?: string;
        teamName?: string;
        teamColor?: string;
        teamAbbreviation?: string;
      }) => ({
        id: player.id,
        name: player.name,
        eloRating: player.eloRating,
        experience: player.experience,
        team: player.teamId
          ? {
              id: player.teamId,
              name: player.teamName,
              color: player.teamColor || "#3B82F6",
              abbreviation: player.teamAbbreviation,
            }
          : null,
      })
    );

    // Remove the fallback logic since we now handle insufficient players above
    // if (players.length < playerCount && excludePlayerIds.length > 0) { ... }

    return NextResponse.json({
      players: transformedPlayers,
      totalAvailable: totalActivePlayers - excludePlayerIds.length,
      performance: {
        method: "optimized_random_selection",
        optimization: "fast_transitions",
      },
    });
  } catch (error) {
    console.error("Error fetching random players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
