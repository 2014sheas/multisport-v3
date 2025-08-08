import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Elo calculation constants
const K_FACTOR = 32;
const BASE_RATING = 1200;

function calculateEloChange(
  winnerRating: number,
  loserRating: number
): { winnerChange: number; loserChange: number } {
  const expectedWinner =
    1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  const winnerChange = Math.round(K_FACTOR * (1 - expectedWinner));
  const loserChange = Math.round(K_FACTOR * (0 - expectedLoser));

  return { winnerChange, loserChange };
}

export async function POST(request: NextRequest) {
  try {
    const { voterSession, winnerId, loserId } = await request.json();

    if (!winnerId || !loserId || !voterSession) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the current players
    const [winner, loser] = await Promise.all([
      prisma.player.findUnique({
        where: { id: winnerId },
        select: { id: true, eloRating: true, gamesPlayed: true },
      }),
      prisma.player.findUnique({
        where: { id: loserId },
        select: { id: true, eloRating: true, gamesPlayed: true },
      }),
    ]);

    if (!winner || !loser) {
      return NextResponse.json({ error: "Players not found" }, { status: 404 });
    }

    // Calculate Elo changes
    const { winnerChange, loserChange } = calculateEloChange(
      winner.eloRating,
      loser.eloRating
    );

    // Update both players in a transaction
    const [updatedWinner, updatedLoser] = await prisma.$transaction([
      prisma.player.update({
        where: { id: winnerId },
        data: {
          eloRating: winner.eloRating + winnerChange,
          gamesPlayed: winner.gamesPlayed + 1,
        },
      }),
      prisma.player.update({
        where: { id: loserId },
        data: {
          eloRating: loser.eloRating + loserChange,
          gamesPlayed: loser.gamesPlayed + 1,
        },
      }),
      // Record the vote
      prisma.vote.create({
        data: {
          voterSession,
          winnerId,
          loserId,
        },
      }),
      // Record Elo history for both players
      prisma.eloHistory.create({
        data: {
          playerId: winnerId,
          oldRating: winner.eloRating,
          newRating: winner.eloRating + winnerChange,
        },
      }),
      prisma.eloHistory.create({
        data: {
          playerId: loserId,
          oldRating: loser.eloRating,
          newRating: loser.eloRating + loserChange,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      winner: {
        id: updatedWinner.id,
        eloRating: updatedWinner.eloRating,
        change: winnerChange,
      },
      loser: {
        id: updatedLoser.id,
        eloRating: updatedLoser.eloRating,
        change: loserChange,
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
