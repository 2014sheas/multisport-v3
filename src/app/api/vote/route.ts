import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Elo calculation constants
const K_FACTOR = 100; // Increased for more dynamic ratings on 0-9999 scale
const BASE_RATING = 5000; // Middle of the 0-9999 scale
const RATING_SCALE = 2000; // Adjusted scale factor for 0-9999 range

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
    const { voterSession, keepId, tradeId, cutId } = await request.json();

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

    // Get the current players
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

    // Calculate Elo changes for keep vs trade
    const { winnerChange: keepTradeChange, loserChange: tradeKeepChange } =
      calculateEloChange(keepPlayer.eloRating, tradePlayer.eloRating);

    // Calculate Elo changes for keep vs cut
    const { winnerChange: keepCutChange, loserChange: cutKeepChange } =
      calculateEloChange(keepPlayer.eloRating, cutPlayer.eloRating);

    // Calculate Elo changes for trade vs cut
    const { winnerChange: tradeCutChange, loserChange: cutTradeChange } =
      calculateEloChange(tradePlayer.eloRating, cutPlayer.eloRating);

    // Update all three players in a transaction
    const [updatedKeep, updatedTrade, updatedCut] = await prisma.$transaction([
      prisma.player.update({
        where: { id: keepId },
        data: {
          eloRating: keepPlayer.eloRating + keepTradeChange + keepCutChange,
          gamesPlayed: keepPlayer.gamesPlayed + 2, // Played against both trade and cut
        },
      }),
      prisma.player.update({
        where: { id: tradeId },
        data: {
          eloRating: tradePlayer.eloRating + tradeKeepChange + tradeCutChange,
          gamesPlayed: tradePlayer.gamesPlayed + 2, // Played against both keep and cut
        },
      }),
      prisma.player.update({
        where: { id: cutId },
        data: {
          eloRating: cutPlayer.eloRating + cutKeepChange + cutTradeChange,
          gamesPlayed: cutPlayer.gamesPlayed + 2, // Played against both keep and trade
        },
      }),
      // Record the vote
      prisma.vote.create({
        data: {
          voterSession,
          keepId,
          tradeId,
          cutId,
        },
      }),
      // Record Elo history for keep player
      prisma.eloHistory.create({
        data: {
          playerId: keepId,
          oldRating: keepPlayer.eloRating,
          newRating: keepPlayer.eloRating + keepTradeChange + keepCutChange,
        },
      }),
      // Record Elo history for trade player
      prisma.eloHistory.create({
        data: {
          playerId: tradeId,
          oldRating: tradePlayer.eloRating,
          newRating: tradePlayer.eloRating + tradeKeepChange + tradeCutChange,
        },
      }),
      // Record Elo history for cut player
      prisma.eloHistory.create({
        data: {
          playerId: cutId,
          oldRating: cutPlayer.eloRating,
          newRating: cutPlayer.eloRating + cutKeepChange + cutTradeChange,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      keep: {
        id: updatedKeep.id,
        eloRating: updatedKeep.eloRating,
        change: keepTradeChange + keepCutChange,
      },
      trade: {
        id: updatedTrade.id,
        eloRating: updatedTrade.eloRating,
        change: tradeKeepChange + tradeCutChange,
      },
      cut: {
        id: updatedCut.id,
        eloRating: updatedCut.eloRating,
        change: cutKeepChange + cutTradeChange,
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
