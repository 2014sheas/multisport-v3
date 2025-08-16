import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This API updates event-specific ratings and creates Elo history
// The teams and players APIs calculate ratings on-the-fly from event ratings
// to ensure consistency between rankings page and teams page

// Elo calculation constants
const K_FACTOR = 800; // Much higher K-factor for very dynamic ratings on 0-9999 scale
const BASE_RATING = 5000; // Middle of the 0-9999 scale
const RATING_SCALE = 750; // Adjusted scale factor for 0-9999 range

function calculateEloChange(
  winnerRating: number,
  loserRating: number
): { winnerChange: number; loserChange: number } {
  const expectedWinner =
    1 / (1 + Math.pow(10, (loserRating - winnerRating) / RATING_SCALE));
  const expectedLoser = 1 - expectedWinner;

  const winnerChange = Math.round(K_FACTOR * (1 - expectedWinner));
  const loserChange = Math.round(K_FACTOR * (0 - expectedLoser));

  return { winnerChange, loserChange };
}

export async function POST(request: NextRequest) {
  try {
    const { voterSession, keepId, tradeId, cutId, eventId } =
      await request.json();

    if (!keepId || !tradeId || !cutId || !voterSession) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate that all three players are different
    if (keepId === tradeId || keepId === cutId || tradeId === cutId) {
      return NextResponse.json(
        { error: "All three players must be different" },
        { status: 400 }
      );
    }

    // Get the current players and their event-specific ratings
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

    // Get or create event-specific ratings
    const [keepEventRating, tradeEventRating, cutEventRating] =
      await Promise.all([
        prisma.eventRating.upsert({
          where: {
            playerId_eventId: {
              playerId: keepId,
              eventId: eventId || "default",
            },
          },
          update: {},
          create: {
            playerId: keepId,
            eventId: eventId || "default",
            rating: keepPlayer.eloRating,
          },
        }),
        prisma.eventRating.upsert({
          where: {
            playerId_eventId: {
              playerId: tradeId,
              eventId: eventId || "default",
            },
          },
          update: {},
          create: {
            playerId: tradeId,
            eventId: eventId || "default",
            rating: tradePlayer.eloRating,
          },
        }),
        prisma.eventRating.upsert({
          where: {
            playerId_eventId: {
              playerId: cutId,
              eventId: eventId || "default",
            },
          },
          update: {},
          create: {
            playerId: cutId,
            eventId: eventId || "default",
            rating: cutPlayer.eloRating,
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
            eventId: eventId || "default",
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
            eventId: eventId || "default",
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
            eventId: eventId || "default",
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
          eventId: eventId || null,
        },
      }),
      // Record Elo history for keep player
      prisma.eloHistory.create({
        data: {
          playerId: keepId,
          oldRating: keepEventRating.rating,
          newRating: keepEventRating.rating + keepTradeChange + keepCutChange,
          eventId: eventId || null,
        },
      }),
      // Record Elo history for trade player
      prisma.eloHistory.create({
        data: {
          playerId: tradeId,
          oldRating: tradeEventRating.rating,
          newRating: tradeEventRating.rating + tradeKeepChange + tradeCutChange,
          eventId: eventId || null,
        },
      }),
      // Record Elo history for cut player
      prisma.eloHistory.create({
        data: {
          playerId: cutId,
          oldRating: cutEventRating.rating,
          newRating: cutEventRating.rating + cutTradeChange + cutKeepChange,
          eventId: eventId || null,
        },
      }),
    ]);

    // Note: We don't update the main player.eloRating field here because:
    // 1. The teams and players APIs now calculate ratings on-the-fly from event ratings
    // 2. This ensures consistency between rankings page and teams page
    // 3. No risk of the main rating field getting out of sync

    return NextResponse.json({
      success: true,
      keep: {
        id: updatedKeep.id,
        eloRating: updatedKeep.rating,
        change: keepTradeChange + keepCutChange,
      },
      trade: {
        id: updatedTrade.id,
        eloRating: updatedTrade.rating,
        change: tradeKeepChange + tradeCutChange,
      },
      cut: {
        id: updatedCut.id,
        eloRating: updatedCut.rating,
        change: cutTradeChange + cutKeepChange,
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
