"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Trophy,
  Users,
  Award,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import AdminGuard from "@/components/AdminGuard";

interface Year {
  id: string;
  year: number;
  isActive: boolean;
  description?: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
  abbreviation?: string;
  year: number;
  captain?: {
    id: string;
    name: string;
    eloRating: number;
  };
  members: Player[];
}

interface Player {
  id: string;
  name: string;
  eloRating: number;
  experience: number;
  wins: number;
}

interface Event {
  id: string;
  name: string;
  abbreviation: string;
  symbol: string;
  eventType: "TOURNAMENT" | "SCORED" | "COMBINED_TEAM";
  status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
  year: number;
  finalStandings: string[] | null;
  points: number[];
}

export default function AdminHistoryPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"teams" | "events" | "summary">(
    "summary"
  );

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      const [yearsResponse, teamsResponse, eventsResponse] = await Promise.all([
        fetch("/api/admin/years"),
        fetch(`/api/admin/teams?year=${selectedYear}`),
        fetch(`/api/admin/events?year=${selectedYear}`),
      ]);

      const yearsData = await yearsResponse.json();
      const teamsData = await teamsResponse.json();
      const eventsData = await eventsResponse.json();

      setYears(yearsData.years || []);
      setTeams(teamsData.teams || []);
      setEvents(eventsData.events || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getYearDescription = (year: number) => {
    const yearData = years.find((y) => y.year === year);
    return yearData?.description || "Historical data";
  };

  const getCompletedEvents = () => {
    return events.filter((event) => event.status === "COMPLETED");
  };

  const getEventWinners = () => {
    const completedEvents = getCompletedEvents();
    const winners: { eventName: string; winner: string; points: number }[] = [];

    completedEvents.forEach((event) => {
      if (event.finalStandings && event.finalStandings.length > 0) {
        const winnerTeam = teams.find(
          (team) => team.id === event.finalStandings![0]
        );
        if (winnerTeam && event.points && event.points.length > 0) {
          winners.push({
            eventName: event.name,
            winner: winnerTeam.name,
            points: event.points[0],
          });
        }
      }
    });

    return winners;
  };

  const getTeamStats = () => {
    return teams
      .map((team) => {
        const completedEvents = getCompletedEvents();
        let totalPoints = 0;
        let eventCount = 0;

        completedEvents.forEach((event) => {
          if (event.finalStandings) {
            const position = event.finalStandings.findIndex(
              (teamId) => teamId === team.id
            );
            if (position >= 0 && event.points && event.points[position]) {
              totalPoints += event.points[position];
              eventCount++;
            }
          }
        });

        return {
          ...team,
          totalPoints,
          eventCount,
          averagePoints:
            eventCount > 0 ? (totalPoints / eventCount).toFixed(1) : "0",
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Calendar className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              Historical Data & Results
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            View and analyze results from previous years, including team
            performance, event outcomes, and player statistics.
          </p>
        </div>

        {/* Year Selector */}
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => {
                const currentIndex = years.findIndex(
                  (y) => y.year === selectedYear
                );
                if (currentIndex < years.length - 1) {
                  setSelectedYear(years[currentIndex + 1].year);
                }
              }}
              disabled={
                years.findIndex((y) => y.year === selectedYear) >=
                years.length - 1
              }
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="text-xl font-bold text-blue-600 bg-transparent border-none focus:ring-0 focus:outline-none"
              >
                {years.map((year) => (
                  <option key={year.id} value={year.year}>
                    {year.year} {year.isActive ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                const currentIndex = years.findIndex(
                  (y) => y.year === selectedYear
                );
                if (currentIndex > 0) {
                  setSelectedYear(years[currentIndex - 1].year);
                }
              }}
              disabled={years.findIndex((y) => y.year === selectedYear) <= 0}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center mt-2">
            <p className="text-gray-600">{getYearDescription(selectedYear)}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("summary")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "summary"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab("teams")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "teams"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Teams ({teams.length})
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "events"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Events ({events.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Teams
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {teams.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Trophy className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Events
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {events.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Completed Events
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {getCompletedEvents().length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Players
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {teams.reduce(
                        (total, team) => total + team.members.length,
                        0
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Teams by Points */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Top Teams by Points
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {getTeamStats().map((team, index) => (
                  <div key={team.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                          <span className="text-sm font-medium text-gray-900">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: team.color }}
                          ></div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {team.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {team.members.length} players | {team.eventCount}{" "}
                              events
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {team.totalPoints} pts
                        </p>
                        <p className="text-sm text-gray-500">
                          Avg: {team.averagePoints}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Winners */}
            {getEventWinners().length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Event Winners
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {getEventWinners().map((winner, index) => (
                    <div key={index} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100">
                            <Trophy className="w-4 h-4 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {winner.eventName}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Winner: {winner.winner}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-yellow-600">
                            {winner.points} pts
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "teams" && (
          <div className="space-y-6">
            {teams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No teams for {selectedYear}
                </h3>
                <p className="text-gray-500">
                  No teams were created for this year.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-white rounded-lg shadow-md p-6 border-l-4"
                    style={{ borderLeftColor: team.color }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {team.name}
                        </h3>
                        {team.abbreviation && (
                          <p className="text-sm text-gray-500">
                            ({team.abbreviation})
                          </p>
                        )}
                      </div>
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: team.color }}
                      ></div>
                    </div>

                    {team.captain && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          Captain
                        </p>
                        <p className="text-sm text-gray-600">
                          {team.captain.name} (Rating: {team.captain.eloRating})
                        </p>
                      </div>
                    )}

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        Players ({team.members.length})
                      </p>
                      <div className="space-y-2">
                        {team.members.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-700">{player.name}</span>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>Rating: {player.eloRating}</span>
                              <span>Exp: {player.experience}y</span>
                              <span>Wins: {player.wins}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "events" && (
          <div className="space-y-6">
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No events for {selectedYear}
                </h3>
                <p className="text-gray-500">
                  No events were scheduled for this year.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`bg-white rounded-lg shadow-md overflow-hidden border ${
                      event.status === "COMPLETED"
                        ? "border-green-200"
                        : event.status === "IN_PROGRESS"
                        ? "border-blue-200"
                        : "border-yellow-200"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{event.symbol}</span>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            event.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : event.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {event.status.replace("_", " ")}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {event.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {event.eventType.replace("_", " ")}
                      </p>

                      {event.status === "COMPLETED" && event.finalStandings && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            Final Standings:
                          </p>
                          <div className="space-y-1">
                            {event.finalStandings
                              .slice(0, 3)
                              .map((teamId, index) => {
                                const team = teams.find((t) => t.id === teamId);
                                return (
                                  <div
                                    key={index}
                                    className="flex items-center space-x-2"
                                  >
                                    <span
                                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${
                                        index === 0
                                          ? "bg-yellow-200 text-yellow-800"
                                          : index === 1
                                          ? "bg-gray-200 text-gray-800"
                                          : "bg-orange-200 text-orange-800"
                                      }`}
                                    >
                                      {index + 1}
                                    </span>
                                    <span className="text-sm text-gray-700">
                                      {team ? team.name : `Team ${teamId}`}
                                    </span>
                                    {event.points && event.points[index] && (
                                      <span className="text-xs text-gray-500 ml-auto">
                                        {event.points[index]} pts
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
