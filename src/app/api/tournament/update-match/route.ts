import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface UpdateMatchRequest {
  matchId: string;
  winnerId: string | null;
  score: [number, number];
  completed?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { matchId, winnerId, score, completed }: UpdateMatchRequest =
      await request.json();

    // Validate request
    if (!matchId || !score) {
      return NextResponse.json(
        { error: "Match ID and score are required" },
        { status: 400 }
      );
    }

    // Get the match with tournament bracket info
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: {
        tournamentBracket: {
          include: {
            participants: true,
            matches: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // If completing the match, validate winner is one of the teams
    if (
      completed &&
      winnerId &&
      winnerId !== match.team1Id &&
      winnerId !== match.team2Id
    ) {
      return NextResponse.json(
        { error: "Winner must be one of the match participants" },
        { status: 400 }
      );
    }

    // Determine update data based on whether we're completing the match
    const updateData: any = {
      score,
    };

    if (completed && winnerId) {
      // Completing the match
      updateData.winnerId = winnerId;
      updateData.status = "COMPLETED";
    } else {
      // Just updating score without completing
      updateData.status = "IN_PROGRESS";
    }

    // Update match
    await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: updateData,
    });

    // Only do tournament progression if the match is being completed
    if (completed && winnerId) {
      // Get loser ID
      const loserId =
        winnerId === match.team1Id ? match.team2Id : match.team1Id;

      // Mark loser as eliminated if this is a losers bracket match
      if (!match.isWinnersBracket) {
        await prisma.tournamentParticipant.update({
          where: {
            tournamentBracketId_teamId: {
              tournamentBracketId: match.tournamentBracketId,
              teamId: loserId,
            },
          },
          data: {
            isEliminated: true,
            eliminationRound: match.round,
          },
        });
      }

      // Advance winner to next round if applicable
      await advanceWinnerToNextRound(match, winnerId, loserId);

      // Check if tournament is complete
      await checkTournamentCompletion(match.tournamentBracketId);
    }

    return NextResponse.json({
      success: true,
      message: "Match updated successfully",
    });
  } catch (error) {
    console.error("Error updating match:", error);
    return NextResponse.json(
      { error: "Failed to update match" },
      { status: 500 }
    );
  }
}

async function advanceWinnerToNextRound(
  match: any,
  winnerId: string,
  loserId: string
) {
  const { tournamentBracketId, round, matchNumber, isWinnersBracket } = match;

  // Find next match for winner
  const nextMatch = await prisma.tournamentMatch.findFirst({
    where: {
      tournamentBracketId,
      round: round + 1,
      isWinnersBracket,
      OR: [
        { team1Id: { startsWith: "TBD_" } },
        { team2Id: { startsWith: "TBD_" } },
        { team1Id: { startsWith: "LOSER_TBD_" } },
        { team2Id: { startsWith: "LOSER_TBD_" } },
      ],
    },
  });

  if (nextMatch) {
    // Determine which team slot to fill
    if (
      nextMatch.team1Id.startsWith("TBD_") ||
      nextMatch.team1Id.startsWith("LOSER_TBD_")
    ) {
      await prisma.tournamentMatch.update({
        where: { id: nextMatch.id },
        data: { team1Id: winnerId },
      });
    } else if (
      nextMatch.team2Id.startsWith("TBD_") ||
      nextMatch.team2Id.startsWith("LOSER_TBD_")
    ) {
      await prisma.tournamentMatch.update({
        where: { id: nextMatch.id },
        data: { team2Id: winnerId },
      });
    }
  }

  // If this is a winners bracket match, loser goes to losers bracket
  if (isWinnersBracket) {
    const losersBracketMatch = await prisma.tournamentMatch.findFirst({
      where: {
        tournamentBracketId,
        round: 1,
        isWinnersBracket: false,
        OR: [
          { team1Id: { startsWith: "LOSER_1_" } },
          { team2Id: { startsWith: "LOSER_1_" } },
        ],
      },
    });

    if (losersBracketMatch) {
      if (losersBracketMatch.team1Id.startsWith("LOSER_1_")) {
        await prisma.tournamentMatch.update({
          where: { id: losersBracketMatch.id },
          data: { team1Id: loserId },
        });
      } else if (losersBracketMatch.team2Id.startsWith("LOSER_1_")) {
        await prisma.tournamentMatch.update({
          where: { id: losersBracketMatch.id },
          data: { team2Id: loserId },
        });
      }
    }
  }
}

async function checkTournamentCompletion(tournamentBracketId: string) {
  // Check if all matches are completed
  const incompleteMatches = await prisma.tournamentMatch.count({
    where: {
      tournamentBracketId,
      status: { not: "COMPLETED" },
    },
  });

  if (incompleteMatches === 0) {
    // Find the final winner
    const finalMatch = await prisma.tournamentMatch.findFirst({
      where: {
        tournamentBracketId,
        round: { gte: 1 },
        isWinnersBracket: true,
        status: "COMPLETED",
      },
      orderBy: { round: "desc" },
    });

    if (finalMatch && finalMatch.winnerId) {
      // Update tournament bracket as completed
      await prisma.tournamentBracket.update({
        where: { id: tournamentBracketId },
        data: {
          status: "COMPLETED",
          winnerId: finalMatch.winnerId,
        },
      });

      // Update winner participant
      await prisma.tournamentParticipant.update({
        where: {
          tournamentBracketId_teamId: {
            tournamentBracketId,
            teamId: finalMatch.winnerId,
          },
        },
        data: { finalPosition: 1 },
      });
    }
  }
}
