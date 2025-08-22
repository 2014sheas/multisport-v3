import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface TeamStanding {
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamColor: string;
  earnedPoints: number;
  projectedPoints: number;
  firstPlaceFinishes: number;
  secondPlaceFinishes: number;
  eventResults: EventResult[];
}

interface EventResult {
  eventId: string;
  eventName: string;
  eventSymbol: string;
  eventAbbreviation: string;
  points: number;
  position: number;
  isProjected: boolean;
}

export async function GET(request: NextRequest) {
  try {
    // Get all events
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        abbreviation: true,
        symbol: true,
        status: true,
        points: true,
        finalStandings: true,
      },
      orderBy: { startTime: "asc" },
    });

    // Type assertion for finalStandings - now stores team IDs (strings)
    const typedEvents = events.map((event) => ({
      ...event,
      finalStandings: event.finalStandings as string[] | null,
    }));

    // Get all teams
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        abbreviation: true,
        color: true,
      },
    });

    // Initialize standings for all teams
    const standings: TeamStanding[] = teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      teamAbbreviation: team.abbreviation || "TBD",
      teamColor: team.color,
      earnedPoints: 0,
      projectedPoints: 0,
      firstPlaceFinishes: 0,
      secondPlaceFinishes: 0,
      eventResults: [],
    }));

    // Process each event
    for (const event of typedEvents) {
      if (event.status === "COMPLETED" && event.finalStandings) {
        // Use actual final standings for completed events
        // finalStandings now contains team IDs directly
        event.finalStandings.forEach((teamId, position) => {
          // Find team by team ID
          const team = standings.find((s) => s.teamId === teamId);
          if (team) {
            const points = event.points[position] || 0;
            team.earnedPoints += points;

            // Count finishes
            if (position === 0) team.firstPlaceFinishes++;
            if (position === 1) team.secondPlaceFinishes++;

            team.eventResults.push({
              eventId: event.id,
              eventName: event.name,
              eventSymbol: event.symbol,
              eventAbbreviation: event.abbreviation,
              points,
              position: position + 1,
              isProjected: false,
            });
          }
        });
      } else {
        // Calculate projected standings for upcoming events based on current team ratings
        const teamRatings = await prisma.eventRating.findMany({
          where: { eventId: event.id },
          select: {
            playerId: true,
            rating: true,
          },
        });

        // Get team members and calculate average team ratings
        const teamAverages: {
          teamId: string;
          averageRating: number;
          memberCount: number;
        }[] = [];

        for (const team of teams) {
          const teamMembers = await prisma.teamMember.findMany({
            where: { teamId: team.id },
            select: { playerId: true },
          });

          if (teamMembers.length > 0) {
            const memberRatings = teamMembers
              .map((member) => {
                const rating = teamRatings.find(
                  (r) => r.playerId === member.playerId
                );
                return rating?.rating || 5000; // Default rating if no event rating
              })
              .filter((rating) => rating > 0);

            if (memberRatings.length > 0) {
              const averageRating =
                memberRatings.reduce((sum, rating) => sum + rating, 0) /
                memberRatings.length;
              teamAverages.push({
                teamId: team.id,
                averageRating,
                memberCount: memberRatings.length,
              });
            }
          }
        }

        // Sort teams by average rating (descending) and assign projected points
        teamAverages
          .sort((a, b) => b.averageRating - a.averageRating)
          .slice(0, event.points.length)
          .forEach((teamAvg, position) => {
            const team = standings.find((s) => s.teamId === teamAvg.teamId);
            if (team) {
              const points = event.points[position] || 0;
              team.projectedPoints += points;

              team.eventResults.push({
                eventId: event.id,
                eventName: event.name,
                eventSymbol: event.symbol,
                eventAbbreviation: event.abbreviation,
                points,
                position: position + 1,
                isProjected: true,
              });
            }
          });
      }
    }

    // Create a copy for display that's sorted by earned points (primary) then projected total (secondary)
    const displayStandings = [...standings].sort((a, b) => {
      if (b.earnedPoints !== a.earnedPoints) {
        return b.earnedPoints - a.earnedPoints;
      }
      return (
        b.earnedPoints +
        b.projectedPoints -
        (a.earnedPoints + a.projectedPoints)
      );
    });

    // Also return the original standings order for finalStandings mapping
    return NextResponse.json({
      standings: displayStandings,
      originalStandings: standings,
    });
  } catch (error) {
    console.error("Error calculating standings:", error);
    return NextResponse.json(
      { error: "Failed to calculate standings" },
      { status: 500 }
    );
  }
}
