import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface GenerateBracketRequest {
  eventId: string;
  seeds: { teamId: string; seed: number }[];
}

export async function POST(request: NextRequest) {
  try {
    const { eventId, seeds }: GenerateBracketRequest = await request.json();

    console.log("Generate bracket request:", { eventId, seeds });

    // Validate request
    if (!eventId || !seeds || seeds.length === 0) {
      console.log("Validation failed:", { eventId, seeds: seeds?.length });
      return NextResponse.json(
        { error: "Event ID and seeds are required" },
        { status: 400 }
      );
    }

    // Check if event exists and is a tournament
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      console.log("Event not found");
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.eventType !== "TOURNAMENT") {
      console.log("Event is not a tournament:", event.eventType);
      return NextResponse.json(
        { error: "Event must be a tournament type" },
        { status: 400 }
      );
    }

    // Check if bracket already exists and delete it to create a new one
    const existingBracket = await prisma.tournamentBracket.findUnique({
      where: { eventId },
    });

    console.log(
      "Event found:",
      event
        ? {
            id: event.id,
            type: event.eventType,
            hasBracket: !!existingBracket,
          }
        : null
    );

    if (existingBracket) {
      console.log(
        "Tournament bracket already exists, deleting it to create new one"
      );
      await prisma.tournamentBracket.delete({
        where: { id: existingBracket.id },
      });
    }

    // Validate seeds match teams
    const teamIds = seeds.map((s) => s.teamId);
    console.log("Looking for teams with IDs:", teamIds);

    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
    });

    console.log("Teams found:", teams.length, "expected:", seeds.length);
    console.log(
      "Found team IDs:",
      teams.map((t) => t.id)
    );

    if (teams.length !== seeds.length) {
      console.log("Team count mismatch - some teams not found");
      return NextResponse.json(
        { error: "Some teams not found" },
        { status: 400 }
      );
    }

    // Create tournament bracket
    const tournamentBracket = await prisma.tournamentBracket.create({
      data: {
        eventId,
        status: "BRACKET_GENERATED",
        participants: {
          create: seeds.map((seed) => ({
            teamId: seed.teamId,
            seed: seed.seed,
          })),
        },
      },
      include: {
        participants: {
          include: { team: true },
        },
      },
    });

    // Generate double elimination bracket matches
    const matches = generateDoubleEliminationBracket(seeds);

    // Get the participant IDs for the teams
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentBracketId: tournamentBracket.id },
      select: { id: true, teamId: true },
    });

    // Create a map of teamId to participantId
    const teamToParticipantMap = new Map(
      participants.map((p) => [p.teamId, p.id])
    );

    // Create matches in order by round to ensure proper references
    const matchNumberToIdMap = new Map();

    // Sort matches by round to ensure dependencies are created first
    const sortedMatches = [...matches].sort((a, b) => a.round - b.round);

    for (const match of sortedMatches) {
      if (match.round === 1) {
        // First round matches
        const team1ParticipantId = teamToParticipantMap.get(match.team1Id);
        const team2ParticipantId = teamToParticipantMap.get(match.team2Id);

        if (!team1ParticipantId || !team2ParticipantId) {
          throw new Error(
            `Could not find participant for team: ${match.team1Id} or ${match.team2Id}`
          );
        }

        const createdMatch = await prisma.tournamentMatch.create({
          data: {
            tournamentBracketId: tournamentBracket.id,
            team1Id: team1ParticipantId,
            team2Id: team2ParticipantId,
            round: match.round,
            matchNumber: match.matchNumber,
            isWinnersBracket: match.isWinnersBracket,
            status: "SCHEDULED" as const,
            // No placeholder references for first round matches
            team1FromMatchId: null,
            team1IsWinner: null,
            team2FromMatchId: null,
            team2IsWinner: null,
          },
        });

        // Add to our map for future references
        matchNumberToIdMap.set(match.matchNumber, createdMatch.id);
      } else {
        // Advancement matches - create with proper references
        const { team1FromMatch, team1IsWinner, team2FromMatch, team2IsWinner } =
          getPlaceholderReferences(match, matches);

        const createdMatch = await prisma.tournamentMatch.create({
          data: {
            tournamentBracketId: tournamentBracket.id,
            team1Id: null, // Will be populated when teams advance
            team2Id: null, // Will be populated when teams advance
            round: match.round,
            matchNumber: match.matchNumber,
            isWinnersBracket: match.isWinnersBracket,
            status: "UNDETERMINED" as const, // These matches can't start until teams advance
            team1FromMatchId: team1FromMatch
              ? matchNumberToIdMap.get(parseInt(team1FromMatch))
              : null,
            team1IsWinner: team1IsWinner,
            team2FromMatchId: team2FromMatch
              ? matchNumberToIdMap.get(parseInt(team2FromMatch))
              : null,
            team2IsWinner: team2IsWinner,
          },
        });

        // Add to our map for future references
        matchNumberToIdMap.set(match.matchNumber, createdMatch.id);
      }
    }

    // Update bracket status
    await prisma.tournamentBracket.update({
      where: { id: tournamentBracket.id },
      data: { status: "IN_PROGRESS" },
    });

    return NextResponse.json({
      success: true,
      tournamentBracket: {
        ...tournamentBracket,
        matches,
      },
    });
  } catch (error) {
    console.error("Error generating tournament bracket:", error);
    return NextResponse.json(
      { error: "Failed to generate tournament bracket" },
      { status: 500 }
    );
  }
}

interface BracketMatch {
  team1Id: string;
  team2Id: string;
  round: number;
  matchNumber: number;
  isWinnersBracket: boolean;
}

function generateDoubleEliminationBracket(
  seeds: { teamId: string; seed: number }[]
): BracketMatch[] {
  const matches: BracketMatch[] = [];
  const numTeams = seeds.length;

  if (numTeams < 2) return matches;

  // Sort seeds by seed number
  const sortedSeeds = [...seeds].sort((a, b) => a.seed - b.seed);

  // For 4-team tournament, create full double elimination bracket
  if (numTeams === 4) {
    // Winners Bracket - First Round
    matches.push(
      {
        team1Id: sortedSeeds[0].teamId, // Seed 1
        team2Id: sortedSeeds[3].teamId, // Seed 4
        round: 1,
        matchNumber: 1,
        isWinnersBracket: true,
      },
      {
        team1Id: sortedSeeds[1].teamId, // Seed 2
        team2Id: sortedSeeds[2].teamId, // Seed 3
        round: 1,
        matchNumber: 2,
        isWinnersBracket: true,
      }
    );

    // Winners Bracket - Second Round (Final)
    matches.push({
      team1Id: "ADVANCE_WINNER_1", // Winner of Game 1
      team2Id: "ADVANCE_WINNER_2", // Winner of Game 2
      round: 2,
      matchNumber: 3,
      isWinnersBracket: true,
    });

    // Losers Bracket - First Round
    matches.push({
      team1Id: "ADVANCE_LOSER_1", // Loser of Game 1
      team2Id: "ADVANCE_LOSER_2", // Loser of Game 2
      round: 2,
      matchNumber: 4,
      isWinnersBracket: false,
    });

    // Losers Bracket - Final
    matches.push({
      team1Id: "ADVANCE_LOSER_3", // Loser of Winners Final
      team2Id: "ADVANCE_WINNER_4", // Winner of Losers First Round
      round: 3,
      matchNumber: 5,
      isWinnersBracket: false,
    });

    // Championship Game
    matches.push({
      team1Id: "ADVANCE_WINNER_3", // Winner of Winners Final
      team2Id: "ADVANCE_WINNER_5", // Winner of Losers Final
      round: 4,
      matchNumber: 6,
      isWinnersBracket: true,
    });

    // "If Necessary" Game (for true double elimination)
    matches.push({
      team1Id: "ADVANCE_LOSER_6", // Loser of Championship
      team2Id: "ADVANCE_WINNER_5", // Winner of Losers Final
      round: 5,
      matchNumber: 7,
      isWinnersBracket: true,
    });
  } else {
    // For other team counts, create basic first round
    let matchNumber = 1;
    for (let i = 0; i < Math.floor(numTeams / 2); i++) {
      const team1Index = i;
      const team2Index = numTeams - 1 - i;

      if (team1Index < team2Index) {
        matches.push({
          team1Id: sortedSeeds[team1Index].teamId,
          team2Id: sortedSeeds[team2Index].teamId,
          round: 1,
          matchNumber: matchNumber++,
          isWinnersBracket: true,
        });
      }
    }
  }

  console.log(
    `Generated ${matches.length} matches for ${numTeams} teams (${
      numTeams === 4 ? "full double elimination" : "basic bracket"
    })`
  );

  return matches;
}

// Helper function to determine which matches feed into each advancement match
function getPlaceholderReferences(
  match: BracketMatch,
  allMatches: BracketMatch[]
): {
  team1FromMatch: string | null;
  team1IsWinner: boolean | null;
  team2FromMatch: string | null;
  team2IsWinner: boolean | null;
} {
  const { round, matchNumber, isWinnersBracket } = match;

  // For 4-team double elimination, we know the structure
  if (round === 2 && isWinnersBracket) {
    // Winners bracket final: winner of game 1 vs winner of game 2
    return {
      team1FromMatch: "1", // Game 1
      team1IsWinner: true,
      team2FromMatch: "2", // Game 2
      team2IsWinner: true,
    };
  } else if (round === 2 && !isWinnersBracket) {
    // Losers bracket first round: loser of game 1 vs loser of game 2
    return {
      team1FromMatch: "1", // Game 1
      team1IsWinner: false,
      team2FromMatch: "2", // Game 2
      team2IsWinner: false,
    };
  } else if (round === 3 && !isWinnersBracket) {
    // Losers bracket final: loser of winners final vs winner of losers first round
    return {
      team1FromMatch: "3", // Winners final (game 3)
      team1IsWinner: false,
      team2FromMatch: "4", // Losers first round (game 4)
      team2IsWinner: true,
    };
  } else if (round === 4 && isWinnersBracket) {
    // Championship: winner of winners final vs winner of losers final
    return {
      team1FromMatch: "3", // Winners final (game 3)
      team1IsWinner: true,
      team2FromMatch: "5", // Losers final (game 5)
      team2IsWinner: true,
    };
  } else if (round === 5 && isWinnersBracket) {
    // If necessary game: winner of championship vs loser of championship
    return {
      team1FromMatch: "6", // Championship (game 6)
      team1IsWinner: true, // Winner of championship
      team2FromMatch: "6", // Championship (game 6)
      team2IsWinner: false, // Loser of championship
    };
  }

  // Default case
  return {
    team1FromMatch: null,
    team1IsWinner: null,
    team2FromMatch: null,
    team2IsWinner: null,
  };
}
