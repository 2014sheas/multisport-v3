"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Calendar, MapPin, Target } from "lucide-react";
import PointHistoryChart from "@/components/PointHistoryChart";

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

export default function StandingsPage() {
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [originalStandings, setOriginalStandings] = useState<TeamStanding[]>(
    []
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<
    "earnedPoints" | "projectedTotal" | "firstPlace" | "secondPlace"
  >("earnedPoints");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentCompletedEventIndex, setCurrentCompletedEventIndex] =
    useState(0);
  const [currentProjectedEventIndex, setCurrentProjectedEventIndex] =
    useState(0);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const [standingsResponse, eventsResponse] = await Promise.all([
          fetch("/api/standings"),
          fetch("/api/events"),
        ]);

        if (standingsResponse.ok && eventsResponse.ok) {
          const standingsData = await standingsResponse.json();
          const eventsData = await eventsResponse.json();
          setStandings(standingsData.standings);
          setOriginalStandings(
            standingsData.originalStandings || standingsData.standings
          );
          setEvents(eventsData.events);
        } else {
          console.error("API responses not ok:", {
            standingsResponse,
            eventsResponse,
          });
        }
      } catch (error) {
        console.error("Error fetching standings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading standings...</p>
          </div>
        </div>
      </div>
    );
  }

  const completedEvents = events.filter(
    (event) => event.status === "COMPLETED"
  );
  const upcomingEvents = events.filter((event) => event.status === "UPCOMING");

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const getSortedStandings = () => {
    return [...standings].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case "earnedPoints":
          aValue = a.earnedPoints;
          bValue = b.earnedPoints;
          break;
        case "projectedTotal":
          aValue = a.earnedPoints + a.projectedPoints;
          bValue = b.earnedPoints + b.projectedPoints;
          break;
        case "firstPlace":
          aValue = a.firstPlaceFinishes;
          bValue = b.firstPlaceFinishes;
          break;
        case "secondPlace":
          aValue = a.secondPlaceFinishes;
          bValue = b.secondPlaceFinishes;
          break;
        default:
          aValue = a.earnedPoints;
          bValue = b.earnedPoints;
      }

      if (sortDirection === "desc") {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            League Standings
          </h1>
          <p className="text-lg text-gray-600">
            Current standings across all events
          </p>
        </div>

        {/* Overall Standings Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              Overall Standings
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th
                    className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("earnedPoints")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Points</span>
                      <span className="w-4 text-center">
                        {sortBy === "earnedPoints" ? (
                          <span className="text-blue-600">
                            {sortDirection === "desc" ? "↓" : "↑"}
                          </span>
                        ) : (
                          <span className="text-transparent">↓</span>
                        )}
                      </span>
                    </div>
                  </th>
                  <th
                    className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("projectedTotal")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Projected Total</span>
                      <span className="w-4 text-center">
                        {sortBy === "projectedTotal" ? (
                          <span className="text-blue-600">
                            {sortDirection === "desc" ? "↓" : "↑"}
                          </span>
                        ) : (
                          <span className="text-transparent">↓</span>
                        )}
                      </span>
                    </div>
                  </th>
                  <th
                    className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("firstPlace")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>1st Place</span>
                      <span className="w-4 text-center">
                        {sortBy === "firstPlace" ? (
                          <span className="text-blue-600">
                            {sortDirection === "desc" ? "↓" : "↑"}
                          </span>
                        ) : (
                          <span className="text-transparent">↓</span>
                        )}
                      </span>
                    </div>
                  </th>
                  <th
                    className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("secondPlace")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>2nd Place</span>
                      <span className="w-4 text-center">
                        {sortBy === "secondPlace" ? (
                          <span className="text-blue-600">
                            {sortDirection === "desc" ? "↓" : "↑"}
                          </span>
                        ) : (
                          <span className="text-transparent">↓</span>
                        )}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedStandings().map((team, index) => (
                  <tr key={team.teamId} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm"
                          style={{ backgroundColor: team.teamColor }}
                        >
                          {team.teamAbbreviation}
                        </div>
                        <div className="ml-2 sm:ml-3">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {team.teamAbbreviation}
                          </div>
                          <div className="hidden sm:block text-xs sm:text-sm text-gray-500">
                            {team.teamName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-semibold text-gray-900">
                        {team.earnedPoints}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-semibold text-blue-600">
                        {team.earnedPoints + team.projectedPoints}
                      </div>
                      <div className="text-xs text-gray-500">
                        +{team.projectedPoints} projected
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {team.firstPlaceFinishes}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {team.secondPlaceFinishes}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Point History Chart */}
        <div className="mb-8">
          <PointHistoryChart standings={standings} events={events} />
        </div>

        {/* Event Breakdown - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completed Events */}
          {completedEvents.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Medal className="w-5 h-5 mr-2 text-green-500" />
                  Completed Events
                </h3>
              </div>
              {completedEvents.length > 1 && (
                <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {completedEvents.map((event, index) => (
                      <button
                        key={event.id}
                        onClick={() => setCurrentCompletedEventIndex(index)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          index === currentCompletedEventIndex
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                        }`}
                      >
                        <span className="mr-1">{event.symbol}</span>
                        {event.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-4 sm:p-6">
                {completedEvents[currentCompletedEventIndex] && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">
                          {completedEvents[currentCompletedEventIndex].symbol}
                        </span>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {completedEvents[currentCompletedEventIndex].name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {
                              completedEvents[currentCompletedEventIndex]
                                .location
                            }{" "}
                            •{" "}
                            {new Date(
                              completedEvents[
                                currentCompletedEventIndex
                              ].startTime
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        Completed
                      </span>
                    </div>
                    <div className="space-y-2">
                      {completedEvents[
                        currentCompletedEventIndex
                      ].finalStandings?.map((teamIndex, position) => {
                        const team = originalStandings[teamIndex - 1];
                        if (!team) return null;
                        return (
                          <div
                            key={position}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-500">
                                #{position + 1}
                              </span>
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: team.teamColor }}
                              >
                                {team.teamAbbreviation}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {team.teamName}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {
                                completedEvents[currentCompletedEventIndex]
                                  .points[position]
                              }{" "}
                              pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-500" />
                  Projected Standings
                </h3>
              </div>
              {upcomingEvents.length > 1 && (
                <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {upcomingEvents.map((event, index) => (
                      <button
                        key={event.id}
                        onClick={() => setCurrentProjectedEventIndex(index)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          index === currentProjectedEventIndex
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                        }`}
                      >
                        <span className="mr-1">{event.symbol}</span>
                        {event.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-4 sm:p-6">
                {upcomingEvents[currentProjectedEventIndex] && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">
                          {upcomingEvents[currentProjectedEventIndex].symbol}
                        </span>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {upcomingEvents[currentProjectedEventIndex].name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {
                              upcomingEvents[currentProjectedEventIndex]
                                .location
                            }{" "}
                            •{" "}
                            {new Date(
                              upcomingEvents[
                                currentProjectedEventIndex
                              ].startTime
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        Projected
                      </span>
                    </div>
                    <div className="space-y-2">
                      {standings
                        .sort((a, b) => {
                          const aEventResult = a.eventResults.find(
                            (r) =>
                              r.eventId ===
                              upcomingEvents[currentProjectedEventIndex].id
                          );
                          const bEventResult = b.eventResults.find(
                            (r) =>
                              r.eventId ===
                              upcomingEvents[currentProjectedEventIndex].id
                          );
                          return (
                            (bEventResult?.points || 0) -
                            (aEventResult?.points || 0)
                          );
                        })
                        .slice(
                          0,
                          upcomingEvents[currentProjectedEventIndex].points
                            .length
                        )
                        .map((team, position) => {
                          const eventResult = team.eventResults.find(
                            (r) =>
                              r.eventId ===
                              upcomingEvents[currentProjectedEventIndex].id
                          );
                          if (!eventResult) return null;
                          return (
                            <div
                              key={position}
                              className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-blue-500">
                                  #{position + 1}
                                </span>
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: team.teamColor }}
                                >
                                  {team.teamAbbreviation}
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {team.teamName}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-semibold text-blue-900">
                                  {
                                    upcomingEvents[currentProjectedEventIndex]
                                      .points[position]
                                  }{" "}
                                  pts
                                </span>
                                <div className="text-xs text-blue-600">
                                  Projected
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
