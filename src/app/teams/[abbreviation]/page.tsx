"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Star,
  Settings,
} from "lucide-react";
import Link from "next/link";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  captainId?: string;
  logo?: string | null;
  captain?: {
    id: string;
    name: string;
    user?: {
      id: string;
    };
  };
}

interface Event {
  id: string;
  name: string;
  abbreviation: string;
  symbol: string;
  eventType: "TOURNAMENT" | "SCORED" | "COMBINED_TEAM";
  status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
}

interface Player {
  id: string;
  name: string;
  rating: number;
  trend: number;
  rank: number;
  isCaptain: boolean;
  experience?: number;
  profilePicture?: string | null;
}

export default function TeamPage({
  params,
}: {
  params: Promise<{ abbreviation: string }>;
}) {
  const { data: session } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [abbreviation, setAbbreviation] = useState<string>("");
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    const getParams = async () => {
      const { abbreviation: abbrev } = await params;
      setAbbreviation(abbrev);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (abbreviation) {
      fetchTeamData();
      fetchEvents();
    }
  }, [abbreviation]);

  useEffect(() => {
    if (abbreviation && selectedEventId !== undefined) {
      fetchTeamPlayers();
    }
  }, [abbreviation, selectedEventId]);

  const fetchTeamData = async () => {
    try {
      const response = await fetch(`/api/teams/${abbreviation}`);
      if (!response.ok) {
        throw new Error("Team not found");
      }
      const data = await response.json();
      setTeam(data.team);

      // Check if user can manage this team
      if (session?.user) {
        const isCaptain =
          data.team.captainId &&
          data.team.captain?.user?.id === session.user.id;
        const isAdmin = session.user.isAdmin;
        setCanManage(isCaptain || isAdmin);
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchTeamPlayers = async () => {
    try {
      const url = selectedEventId
        ? `/api/teams/${abbreviation}/players?eventId=${selectedEventId}`
        : `/api/teams/${abbreviation}/players`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      }
    } catch (error) {
      console.error("Error fetching team players:", error);
    }
  };

  const TrendIndicator = ({ trend }: { trend: number }) => {
    if (trend === 0) {
      return (
        <div className="flex items-center text-gray-500">
          <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
          <span className="text-xs">-</span>
        </div>
      );
    } else if (trend > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
          <span className="text-xs">+{trend}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
          <span className="text-xs">{trend}</span>
        </div>
      );
    }
  };

  const formatExperience = (years: number | undefined) => {
    const experienceYears = years ?? 0;
    if (experienceYears === 0) {
      return "Rookie";
    } else if (experienceYears === 1) {
      return "1st year";
    } else if (experienceYears === 2) {
      return "2nd year";
    } else if (experienceYears === 3) {
      return "3rd year";
    } else {
      return `${experienceYears}th year`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Team Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The team you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/teams"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Teams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Back Button */}
      <div className="mb-4 sm:mb-6">
        <Link
          href="/teams"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Teams
        </Link>
      </div>

      {/* Team Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-start justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-4">
              {team.logo ? (
                <img
                  src={team.logo}
                  alt={`${team.name} logo`}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border-2 border-gray-200"
                />
              ) : (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-white"
                  style={{ backgroundColor: team.color }}
                >
                  {team.abbreviation}
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  {team.name}
                </h1>
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                    {team.abbreviation}
                  </span>
                  {team.captainId && (
                    <span className="inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      <Star className="w-3 h-3 mr-1" />
                      Has Captain
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Manage Team Button */}
            {canManage && (
              <Link
                href={`/teams/${abbreviation}/manage`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Team
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Event Selection */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Team Players
            </h2>
            <div className="flex items-center space-x-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Overall</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.symbol} {event.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {players.length > 0 ? (
            players.map((player, index) => (
              <div
                key={player.id}
                className="py-4 px-4 sm:px-6 hover:bg-gray-50 transition-colors"
                style={{
                  borderLeftColor: team.color,
                  borderLeftWidth: "4px",
                  backgroundColor: `${team.color}05`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Player Info */}
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                        {player.profilePicture ? (
                          <img
                            src={player.profilePicture}
                            alt={player.name}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm font-bold text-blue-600">
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/players/${encodeURIComponent(player.name)}`}
                            className="text-sm sm:text-base font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {player.name}
                          </Link>
                          {player.isCaptain && (
                            <Star
                              className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500"
                              fill="currentColor"
                            />
                          )}
                        </div>
                        {player.experience !== undefined && (
                          <p className="text-xs text-gray-500">
                            {formatExperience(player.experience)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    {/* 24h Trend */}
                    <div className="text-center">
                      <TrendIndicator trend={player.trend} />
                      <p className="text-xs text-gray-500">24h Trend</p>
                    </div>

                    {/* Rating */}
                    <div className="text-center">
                      <p className="text-sm sm:text-base font-semibold text-gray-900">
                        {player.rating}
                      </p>
                      <p className="text-xs text-gray-500">Rating</p>
                    </div>

                    {/* Global Rank */}
                    <div className="text-center">
                      <p className="text-sm sm:text-base font-semibold text-gray-900">
                        #{player.rank}
                      </p>
                      <p className="text-xs text-gray-500">Overall Rank</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              {selectedEventId
                ? "No players found for this event."
                : "No players found for this team."}
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {players.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Users className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No players found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedEventId
              ? "This team doesn't have any players participating in this event."
              : "This team doesn't have any players yet."}
          </p>
        </div>
      )}
    </div>
  );
}
