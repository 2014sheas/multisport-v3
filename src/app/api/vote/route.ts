import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Elo rating calculation function
function calculateEloChange(winnerRating: number, loserRating: number) {
  const expectedWinnerScore =
    1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoserScore = 1 - expectedWinnerScore;

  const actualWinnerScore = 1;
  const actualLoserScore = 0;

  const kFactor = 32; // Standard K-factor for Elo calculations

  const winnerChange = Math.round(
    kFactor * (actualWinnerScore - expectedWinnerScore)
  );
  const loserChange = Math.round(
    kFactor * (actualLoserScore - expectedLoserScore)
  );

  return { winnerChange, loserChange };
}

export async function POST(request: NextRequest) {
  try {
    // Remove authentication requirement - anyone can vote
    const { keepId, tradeId, cutId, eventId, voterSession } =
      await request.json();

    // Validate required fields
    if (!keepId || !tradeId || !cutId || !eventId || !voterSession) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: keepId, tradeId, cutId, eventId, and voterSession are required",
        },
        { status: 400 }
      );
    }

    // Ensure all three players are different
    if (keepId === tradeId || keepId === cutId || tradeId === cutId) {
      return NextResponse.json(
        { error: "All three players must be different" },
        { status: 400 }
      );
    }

    // Verify the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Get the three players
    const [keepPlayer, tradePlayer, cutPlayer] = await Promise.all([
      prisma.player.findUnique({
        where: { id: keepId },
        select: { id: true, eloRating: true, gamesPlayed: true },
      }),
      prisma.player.findUnique({
        where: { id: tradeId },
        select: { id: true, eloRating: true, gamesPlayed: true },
      }),
      prisma.player.findUnique({
        where: { id: cutId },
        select: { id: true, eloRating: true, gamesPlayed: true },
      }),
    ]);

    if (!keepPlayer || !tradePlayer || !cutPlayer) {
      return NextResponse.json({ error: "Players not found" }, { status: 404 });
    }

    // Get or create event-specific ratings for the specific event
    const [keepEventRating, tradeEventRating, cutEventRating] =
      await Promise.all([
        prisma.eventRating.upsert({
          where: {
            playerId_eventId: {
              playerId: keepId,
              eventId: eventId,
            },
          },
          update: {},
          create: {
            playerId: keepId,
            eventId: eventId,
            rating: 5000,
          },
        }),
        prisma.eventRating.upsert({
          where: {
            playerId_eventId: {
              playerId: tradeId,
              eventId: eventId,
            },
          },
          update: {},
          create: {
            playerId: tradeId,
            eventId: eventId,
            rating: 5000,
          },
        }),
        prisma.eventRating.upsert({
          where: {
            playerId_eventId: {
              playerId: cutId,
              eventId: eventId,
            },
          },
          update: {},
          create: {
            playerId: cutId,
            eventId: eventId,
            rating: 5000,
          },
        }),
      ]);

    // Calculate Elo changes for keep vs trade
    const { winnerChange: keepTradeChange, loserChange: tradeKeepChange } =
      calculateEloChange(keepEventRating.rating, tradeEventRating.rating);

    // Calculate Elo changes for keep vs cut
    const { winnerChange: keepCutChange, loserChange: cutKeepChange } =
      calculateEloChange(keepEventRating.rating, cutEventRating.rating);

    // Calculate Elo changes for trade vs cut
    const { winnerChange: tradeCutChange, loserChange: cutTradeChange } =
      calculateEloChange(tradeEventRating.rating, cutEventRating.rating);

    // Update all three players' event-specific ratings in a transaction
    const [updatedKeep, updatedTrade, updatedCut] = await prisma.$transaction([
      prisma.eventRating.update({
        where: {
          playerId_eventId: {
            playerId: keepId,
            eventId: eventId,
          },
        },
        data: {
          rating: keepEventRating.rating + keepTradeChange + keepCutChange,
          gamesPlayed: keepEventRating.gamesPlayed + 2,
        },
      }),
      prisma.eventRating.update({
        where: {
          playerId_eventId: {
            playerId: tradeId,
            eventId: eventId,
          },
        },
        data: {
          rating: tradeEventRating.rating + tradeKeepChange + tradeCutChange,
          gamesPlayed: tradeEventRating.gamesPlayed + 2,
        },
      }),
      prisma.eventRating.update({
        where: {
          playerId_eventId: {
            playerId: cutId,
            eventId: eventId,
          },
        },
        data: {
          rating: cutEventRating.rating + cutTradeChange + cutKeepChange,
          gamesPlayed: cutEventRating.gamesPlayed + 2,
        },
      }),
      // Record the vote
      prisma.vote.create({
        data: {
          voterSession,
          keepId,
          tradeId,
          cutId,
          eventId: eventId,
        },
      }),
      // Record Elo history for keep player
      prisma.eloHistory.create({
        data: {
          playerId: keepId,
          oldRating: keepEventRating.rating,
          newRating: keepEventRating.rating + keepTradeChange + keepCutChange,
          eventId: eventId,
        },
      }),
      // Record Elo history for trade player
      prisma.eloHistory.create({
        data: {
          playerId: tradeId,
          oldRating: tradeEventRating.rating,
          newRating: tradeEventRating.rating + tradeKeepChange + tradeCutChange,
          eventId: eventId,
        },
      }),
      // Record Elo history for cut player
      prisma.eloHistory.create({
        data: {
          playerId: cutId,
          oldRating: cutEventRating.rating,
          newRating: cutEventRating.rating + cutTradeChange + cutKeepChange,
          eventId: eventId,
        },
      }),
    ]);

    // Note: We don't update the main player.eloRating field here because:
    // 1. We're now using event-specific ratings for all calculations
    // 2. The global eloRating can be calculated as an average of event ratings if needed
    // 3. This keeps the data more accurate and event-specific

    return NextResponse.json({
      success: true,
      message: "Vote recorded successfully",
      eventId: eventId,
      ratings: {
        keep: {
          playerId: keepId,
          oldRating: keepEventRating.rating,
          newRating: updatedKeep.rating,
          change: keepTradeChange + keepCutChange,
        },
        trade: {
          playerId: tradeId,
          oldRating: tradeEventRating.rating,
          newRating: updatedTrade.rating,
          change: tradeKeepChange + tradeCutChange,
        },
        cut: {
          playerId: cutId,
          oldRating: cutEventRating.rating,
          newRating: updatedCut.rating,
          change: cutKeepChange + cutTradeChange,
        },
      },
    });
  } catch (error) {
    console.error("Error processing vote:", error);
    return NextResponse.json(
      { error: "Failed to process vote" },
      { status: 500 }
    );
  }
}
