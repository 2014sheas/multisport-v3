import React from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

interface Event {
  id: string;
  name: string;
  abbreviation: string;
  symbol: string;
  status: string;
  points: number[];
  finalStandings: number[] | null;
  startTime: string;
  location: string;
}

interface ChartDataPoint {
  event: string;
  eventName: string;
  eventAbbreviation: string;
  eventNumber: number;
  isProjected: boolean;
  [key: string]: string | number | boolean; // For team abbreviations as dynamic keys
}

interface PointHistoryChartProps {
  standings: TeamStanding[];
  events: Event[];
}

export default function PointHistoryChart({
  standings,
  events,
}: PointHistoryChartProps) {
  // Filter and sort all events by start time to maintain chronological order
  const allEvents = events.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const completedEvents = allEvents.filter(
    (event) => event.status === "COMPLETED"
  );
  const upcomingEvents = allEvents.filter(
    (event) => event.status === "UPCOMING"
  );

  if (completedEvents.length === 0 && upcomingEvents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Point History Chart
        </h3>
        <p className="text-gray-500 text-center py-8">
          No events yet. The chart will appear here once events are created.
        </p>
      </div>
    );
  }

  // Create separate datasets for completed vs projected to enable different line styles
  const completedChartData = completedEvents.map((event, index) => {
    const dataPoint: ChartDataPoint = {
      event: event.symbol,
      eventName: event.name,
      eventAbbreviation: event.abbreviation,
      eventNumber: index + 1, // Sequential event numbers starting from 1
      isProjected: false,
    };

    standings.forEach((team) => {
      let cumulativePoints = 0;
      for (let i = 0; i <= index; i++) {
        const eventResult = team.eventResults.find(
          (r) => r.eventId === completedEvents[i].id && !r.isProjected
        );
        if (eventResult) {
          cumulativePoints += eventResult.points;
        }
      }
      dataPoint[team.teamAbbreviation] = cumulativePoints;
    });

    return dataPoint;
  });

  // Create projected dataset that starts from the last completed event
  const projectedChartData = upcomingEvents.map((event, index) => {
    const dataPoint: ChartDataPoint = {
      event: event.symbol,
      eventName: event.name,
      eventAbbreviation: event.abbreviation,
      eventNumber: completedEvents.length + index + 1, // Continue from where completed events left off
      isProjected: true,
    };

    standings.forEach((team) => {
      let cumulativePoints = 0;

      // Start with points from completed events
      completedEvents.forEach((completedEvent) => {
        const eventResult = team.eventResults.find(
          (r) => r.eventId === completedEvent.id && !r.isProjected
        );
        if (eventResult) {
          cumulativePoints += eventResult.points;
        }
      });

      // Add projected points up to this event
      for (let i = 0; i <= index; i++) {
        const eventResult = team.eventResults.find(
          (r) => r.eventId === upcomingEvents[i].id && r.isProjected
        );
        if (eventResult) {
          cumulativePoints += eventResult.points;
        }
      }

      dataPoint[team.teamAbbreviation] = cumulativePoints;
    });

    return dataPoint;
  });

  // Add a starting point at 0 for all teams
  const startingPoint: ChartDataPoint = {
    event: "Start",
    eventName: "Season Start",
    eventAbbreviation: "START",
    eventNumber: 0, // Start at event number 0
    isProjected: false,
  };

  standings.forEach((team) => {
    startingPoint[team.teamAbbreviation] = 0;
  });

  // Create the main chart data with sequential event numbers
  const mainChartData = [startingPoint, ...completedChartData];

  // Create projected data that starts from the last completed event
  const projectedChartDataWithOverlap = [
    // Add a point at the last completed event timestamp with the final completed points
    ...completedEvents.map((event, index) => {
      const dataPoint: ChartDataPoint = {
        event: event.symbol,
        eventName: event.name,
        eventAbbreviation: event.abbreviation,
        eventNumber: index + 1, // Sequential event numbers starting from 1
        isProjected: false,
      };

      standings.forEach((team) => {
        let cumulativePoints = 0;
        for (let i = 0; i <= index; i++) {
          const eventResult = team.eventResults.find(
            (r) => r.eventId === completedEvents[i].id && !r.isProjected
          );
          if (eventResult) {
            cumulativePoints += eventResult.points;
          }
        }
        dataPoint[team.teamAbbreviation] = cumulativePoints;
      });

      return dataPoint;
    }),
    // Add projected events
    ...projectedChartData,
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Point History & Projections
      </h3>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={[...mainChartData, ...projectedChartData]}
            margin={{ left: 0, right: 5, top: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="eventNumber"
              type="number"
              domain={[0, completedEvents.length + upcomingEvents.length]}
              ticks={Array.from(
                { length: completedEvents.length + upcomingEvents.length + 1 },
                (_, i) => i
              )}
              tickFormatter={(eventNumber) => {
                if (eventNumber === 0) return "Start";

                // Find the event by event number
                const allEventsData = [...mainChartData, ...projectedChartData];
                const event = allEventsData.find(
                  (e) => e.eventNumber === eventNumber
                );

                if (event) {
                  return event.event; // Return the event symbol (🏀, ⚾, ⚽, etc.)
                }

                return "";
              }}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const eventName = payload[0]?.payload?.eventName;
                  const isProjected = payload[0]?.payload?.isProjected;

                  // Remove duplicates by team name
                  const uniqueEntries = payload.reduce(
                    (acc: any[], entry: any) => {
                      const existingEntry = acc.find(
                        (item: any) => item.name === entry.name
                      );
                      if (!existingEntry) {
                        acc.push(entry);
                      }
                      return acc;
                    },
                    []
                  );

                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900 mb-2">
                        {eventName === "Season Start"
                          ? "Season Start"
                          : eventName}
                        {isProjected && (
                          <span className="ml-2 text-blue-600 text-sm">
                            (Projected)
                          </span>
                        )}
                      </p>
                      {uniqueEntries.map((entry: any, index: number) => (
                        <p
                          key={index}
                          className="text-sm"
                          style={{ color: entry.color }}
                        >
                          {entry.name}: {entry.value} pts
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            {standings.map((team) => (
              <React.Fragment key={team.teamId}>
                {/* Solid line for completed events */}
                <Line
                  type="linear"
                  dataKey={team.teamAbbreviation}
                  stroke={team.teamColor}
                  strokeWidth={3}
                  dot={{ fill: team.teamColor, strokeWidth: 2, r: 4 }}
                  activeDot={{
                    r: 6,
                    stroke: team.teamColor,
                    strokeWidth: 2,
                  }}
                  name={team.teamName}
                  data={mainChartData}
                />

                {/* Dotted line for projected events - hidden from legend */}
                {upcomingEvents.length > 0 && (
                  <Line
                    type="linear"
                    dataKey={team.teamAbbreviation}
                    stroke={team.teamColor}
                    strokeWidth={3}
                    strokeDasharray="5,5"
                    dot={{ fill: team.teamColor, strokeWidth: 2, r: 4 }}
                    activeDot={{
                      r: 6,
                      stroke: team.teamColor,
                      strokeWidth: 2,
                    }}
                    legendType="none"
                    name={team.teamName}
                    data={projectedChartDataWithOverlap}
                  />
                )}
              </React.Fragment>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
