import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface TeamStanding {
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamColor: string;
  teamLogo?: string | null;
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

export async function GET() {
  try {
    // Use a single optimized query to get all data at once
    const teamsWithMembers = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        abbreviation: true,
        color: true,
        logo: true,
        members: {
          select: {
            player: {
              select: {
                eventRatings: {
                  select: {
                    eventId: true,
                    rating: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get all events in one query
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        abbreviation: true,
        symbol: true,
        status: true,
        points: true,
        finalStandings: true,
        eventType: true,
      },
      orderBy: { startTime: "asc" },
    });

    // Type assertion for finalStandings
    const typedEvents = events.map((event) => ({
      ...event,
      finalStandings: event.finalStandings as string[] | null,
    }));

    // Initialize standings for all teams
    const standings: TeamStanding[] = teamsWithMembers.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      teamAbbreviation: team.abbreviation || "TBD",
      teamColor: team.color,
      teamLogo: team.logo,
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
        event.finalStandings.forEach((teamId, position) => {
          const team = standings.find((s) => s.teamId === teamId);
          if (team) {
            const points = event.points[position] || 0;
            team.earnedPoints += points;

            // Count finishes based on event type
            if (event.eventType === "COMBINED_TEAM") {
              if (position < 2) team.firstPlaceFinishes++;
              if (position >= 2) team.secondPlaceFinishes++;
            } else {
              if (position === 0) team.firstPlaceFinishes++;
              if (position === 1) team.secondPlaceFinishes++;
            }

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
        // Calculate projected standings for upcoming events using pre-fetched data
        const teamAverages: {
          teamId: string;
          averageRating: number;
          memberCount: number;
        }[] = [];

        for (const team of teamsWithMembers) {
          if (team.members.length > 0) {
            // Get event ratings for this specific event
            const memberRatings = team.members
              .map((member) => {
                const eventRating = member.player.eventRatings.find(
                  (r) => r.eventId === event.id
                );
                return eventRating?.rating || 5000; // Default rating if no event rating
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

        // Sort teams by average rating and assign projected points
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

    // Sort standings by earned points (primary) then projected total (secondary)
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

    // Add caching headers for better performance
    const response = NextResponse.json({
      standings: displayStandings,
      originalStandings: standings,
    });

    // Cache for 30 seconds to reduce database load
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );

    return response;
  } catch (error) {
    console.error("Error calculating standings:", error);
    return NextResponse.json(
      { error: "Failed to calculate standings" },
      { status: 500 }
    );
  }
}
