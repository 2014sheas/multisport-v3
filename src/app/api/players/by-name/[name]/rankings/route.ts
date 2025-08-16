import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  try {
    // First, verify the player exists and get their ID
    const player = await prisma.player.findFirst({
      where: { name: decodedName },
      select: { id: true },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Get all events the player has participated in
    const playerEventRatings = await prisma.eventRating.findMany({
      where: {
        playerId: player.id,
      },
      select: {
        eventId: true,
        rating: true,
        gamesPlayed: true,
      },
    });

    if (playerEventRatings.length === 0) {
      return NextResponse.json({ rankings: [] });
    }

    // Get event details for all events the player participated in
    const eventIds = playerEventRatings.map((rating) => rating.eventId);
    const events = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
      },
      select: {
        id: true,
        name: true,
        abbreviation: true,
        symbol: true,
        eventType: true,
        status: true,
      },
    });

    // Create a map for quick event lookup
    const eventMap = new Map(events.map((event) => [event.id, event]));

    // Get global rankings for each event
    const rankings = await Promise.all(
      playerEventRatings.map(async (rating) => {
        const event = eventMap.get(rating.eventId);
        if (!event) return null;

        // Get global rankings for this specific event
        const globalEventRankings = await prisma.eventRating.findMany({
          where: {
            eventId: rating.eventId,
          },
          select: {
            playerId: true,
            rating: true,
          },
          orderBy: {
            rating: "desc",
          },
        });

        // Find this player's global rank in the event
        const globalRank =
          globalEventRankings.findIndex(
            (ranking) => ranking.playerId === player.id
          ) + 1;

        // Get 24h trend for this player in this event
        const eloHistory = await prisma.eloHistory.findMany({
          where: {
            playerId: player.id,
            eventId: rating.eventId,
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          select: {
            oldRating: true,
            newRating: true,
            timestamp: true,
          },
          orderBy: {
            timestamp: "asc",
          },
        });

        // Calculate 24h trend
        let trend = 0;
        if (eloHistory.length > 0) {
          const initialRating = eloHistory[0].oldRating;
          const finalRating = eloHistory[eloHistory.length - 1].newRating;
          trend = Math.round(finalRating - initialRating);
        }

        return {
          eventId: rating.eventId,
          eventName: event.name,
          eventAbbreviation: event.abbreviation,
          eventSymbol: event.symbol,
          rating: rating.rating,
          globalRank: globalRank,
          trend: trend,
          gamesPlayed: rating.gamesPlayed,
        };
      })
    );

    // Filter out null values and sort by global rank
    const validRankings = rankings
      .filter(
        (ranking): ranking is NonNullable<typeof ranking> => ranking !== null
      )
      .sort((a, b) => a.globalRank - b.globalRank);

    return NextResponse.json({ rankings: validRankings });
  } catch (error) {
    console.error("Error fetching player rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch player rankings" },
      { status: 500 }
    );
  }
}
