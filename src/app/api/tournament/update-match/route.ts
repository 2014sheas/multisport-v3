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
    const updateData: {
      score: [number, number];
      winnerId?: string;
      status: "IN_PROGRESS" | "COMPLETED";
    } = {
      score,
      status: "IN_PROGRESS", // Default status
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
    if (completed && winnerId && match.team1Id && match.team2Id) {
      // Get loser ID
      const loserId =
        winnerId === match.team1Id ? match.team2Id : match.team1Id;

      // Mark loser as eliminated if this is a losers bracket match
      if (!match.isWinnersBracket) {
        // Find the participant record for the loser
        const loserParticipant = await prisma.tournamentParticipant.findFirst({
          where: {
            tournamentBracketId: match.tournamentBracketId,
            id: loserId, // loserId is actually the participant ID
          },
        });

        if (loserParticipant) {
          await prisma.tournamentParticipant.update({
            where: {
              id: loserParticipant.id,
            },
            data: {
              isEliminated: true,
              eliminationRound: match.round,
            },
          });
        }
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
  match: {
    id: string;
    tournamentBracketId: string;
    round: number;
    matchNumber: number;
    isWinnersBracket: boolean;
  },
  winnerId: string,
  loserId: string
) {
  const { tournamentBracketId, round, matchNumber, isWinnersBracket } = match;

  // Find matches that are waiting for this match's result
  const nextMatches = await prisma.tournamentMatch.findMany({
    where: {
      tournamentBracketId,
      OR: [
        { team1FromMatchId: match.id }, // Use actual match ID, not matchNumber
        { team2FromMatchId: match.id },
      ],
    },
  });

  // Update each waiting match
  for (const nextMatch of nextMatches) {
    if (nextMatch.team1FromMatchId === match.id) {
      // This match is waiting for team1 from our match
      const isWinner = nextMatch.team1IsWinner;
      if (isWinner) {
        // Waiting for winner
        await prisma.tournamentMatch.update({
          where: { id: nextMatch.id },
          data: {
            team1Id: winnerId,
          },
        });
      } else {
        // Waiting for loser
        await prisma.tournamentMatch.update({
          where: { id: nextMatch.id },
          data: {
            team1Id: loserId,
          },
        });
      }
    }

    if (nextMatch.team2FromMatchId === match.id) {
      // This match is waiting for team2 from our match
      const isWinner = nextMatch.team2IsWinner;
      if (isWinner) {
        // Waiting for winner
        await prisma.tournamentMatch.update({
          where: { id: nextMatch.id },
          data: {
            team2Id: winnerId,
          },
        });
      } else {
        // Waiting for loser
        await prisma.tournamentMatch.update({
          where: { id: nextMatch.id },
          data: {
            team2Id: loserId,
          },
        });
      }
    }

    // After updating teams, check if both teams are now determined
    // and update status to SCHEDULED if so
    const updatedMatch = await prisma.tournamentMatch.findUnique({
      where: { id: nextMatch.id },
    });

    if (updatedMatch && updatedMatch.team1Id && updatedMatch.team2Id) {
      // Both teams are determined, can now be scheduled
      await prisma.tournamentMatch.update({
        where: { id: nextMatch.id },
        data: {
          status: "SCHEDULED",
        },
      });
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
      const winnerParticipant = await prisma.tournamentParticipant.findFirst({
        where: {
          tournamentBracketId,
          id: finalMatch.winnerId, // winnerId is actually the participant ID
        },
      });

      if (winnerParticipant) {
        await prisma.tournamentParticipant.update({
          where: {
            id: winnerParticipant.id,
          },
          data: { finalPosition: 1 },
        });
      }
    }
  }
}
