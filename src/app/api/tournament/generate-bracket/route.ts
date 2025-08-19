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
      include: { tournamentBracket: true },
    });

    console.log(
      "Event found:",
      event
        ? {
            id: event.id,
            type: event.eventType,
            hasBracket: !!event.tournamentBracket,
          }
        : null
    );

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

    // If bracket already exists, delete it to create a new one
    if (event.tournamentBracket) {
      console.log(
        "Tournament bracket already exists, deleting it to create new one"
      );
      await prisma.tournamentBracket.delete({
        where: { id: event.tournamentBracket.id },
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

    // Create matches in database using participant IDs
    const matchData = matches.map((match) => {
      const team1ParticipantId = teamToParticipantMap.get(match.team1Id);
      const team2ParticipantId = teamToParticipantMap.get(match.team2Id);

      if (!team1ParticipantId || !team2ParticipantId) {
        throw new Error(
          `Could not find participant for team: ${match.team1Id} or ${match.team2Id}`
        );
      }

      return {
        tournamentBracketId: tournamentBracket.id,
        team1Id: team1ParticipantId,
        team2Id: team2ParticipantId,
        round: match.round,
        matchNumber: match.matchNumber,
        isWinnersBracket: match.isWinnersBracket,
        status: "SCHEDULED" as const,
      };
    });

    await prisma.tournamentMatch.createMany({
      data: matchData,
    });

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

  // Winners Bracket - First Round (seeded matchups)
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

  // For now, only create first round matches with real teams
  // We'll add advancement logic later when implementing match progression
  console.log(
    `Generated ${matches.length} first round matches for ${numTeams} teams`
  );

  return matches;
}
