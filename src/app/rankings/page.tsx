"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Check,
  XCircle,
  Star,
  TrendingDown,
  Minus,
  Filter,
  Users,
  Calendar,
  Vote,
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  eloRating: number;
  experience: number;
  rank: number;
  trend: number;
  captainedTeams: Array<{
    id: string;
    name: string;
  }>;
  team: {
    id: string;
    name: string;
    color: string;
    abbreviation?: string;
  } | null;
  eloHistory: Array<{
    oldRating: number;
    newRating: number;
    timestamp: string;
  }>;
  eventId?: string;
  eventName?: string;
  eventAbbreviation?: string;
  gamesPlayed?: number;
}

interface Event {
  id: string;
  name: string;
  abbreviation: string;
  symbol: string;
  eventType: "TOURNAMENT" | "SCORED";
  status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
  startTime: string;
  location: string;
  points: number[];
  finalStandings: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// Fallback colors for teams that don't have colors set in the database
const fallbackTeamColors: Record<string, string> = {
  "Team Alpha": "#EF4444", // Red
  "Team Beta": "#3B82F6", // Blue
  "Team Gamma": "#10B981", // Green
  "Team Delta": "#F59E0B", // Yellow
  "Team Echo": "#8B5CF6", // Purple
  "Team Foxtrot": "#F97316", // Orange
  "Team Golf": "#06B6D4", // Cyan
  "Team Hotel": "#EC4899", // Pink
};

const getTeamColor = (
  team: { name: string; color?: string } | null
): string => {
  if (!team) return "#6B7280"; // Gray for free agents
  return team.color || fallbackTeamColors[team.name] || "#3B82F6"; // Use DB color, fallback, or default blue
};

const getTeamAbbreviation = (
  team: { name: string; abbreviation?: string } | null
): string => {
  if (!team) return "FA"; // Free Agent

  // If abbreviation exists, use it
  if (team.abbreviation) {
    return team.abbreviation;
  }

  // Generate abbreviation from team name
  const words = team.name.split(" ");
  if (words.length === 1) {
    // Single word team name - take first 3 letters
    return team.name.substring(0, 3).toUpperCase();
  } else {
    // Multiple words - take first letter of each word
    return words
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  }
};

export default function RankingsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchRankings();
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    }
  };

  const fetchRankings = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = selectedEventId
        ? `/api/rankings?eventId=${selectedEventId}`
        : "/api/rankings";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPlayers(data.players || []);
    } catch (error) {
      console.error("Error fetching rankings:", error);
      setError("Failed to load rankings. Please try again.");
      setPlayers([]);
    } finally {
      setLoading(false);
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

  const TrendIndicator = ({ trend }: { trend: number }) => {
    if (trend === 0) {
      return (
        <div className="flex items-center text-gray-500">
          <Minus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span className="text-xs sm:text-sm hidden sm:inline">No change</span>
          <span className="text-xs sm:hidden">-</span>
        </div>
      );
    } else if (trend > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span className="text-xs sm:text-sm">+{trend}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span className="text-xs sm:text-sm">{trend}</span>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Players
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          Current Values and performance history
        </p>

        {/* Event Selection */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Overall</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.symbol} {event.name}
              </option>
            ))}
          </select>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>

        {events.length === 0 && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <Calendar className="w-4 h-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">
                No events available. Contact an administrator to create events.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center px-3 py-2 bg-red-50 border border-red-200 rounded-md">
              <XCircle className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{error}</span>
              <button
                onClick={fetchRankings}
                className="ml-2 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Voting Button */}
        <div className="text-center mb-6">
          <a
            href="/vote"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-medium shadow-sm hover:shadow-md"
          >
            <Vote className="w-5 h-5 mr-2" />
            Vote on Players
          </a>
          <p className="text-xs text-gray-500 mt-2">
            Help rank players by participating in the voting system
          </p>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">
            <div className="w-12 sm:w-16 flex-shrink-0">Rank</div>
            <div className="flex-1 min-w-0">Player</div>
            <div className="w-20 flex-shrink-0 text-center hidden sm:block">
              Experience
            </div>
            <div className="w-20 flex-shrink-0 text-center">Team</div>
            <div className="w-16 flex-shrink-0 text-center">24h Trend</div>
            <div className="w-16 sm:w-20 flex-shrink-0 text-center">Value</div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {players.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <Users className="h-12 w-12" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No players found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedEventId
                  ? "No players have ratings for this event yet. Players will appear here once they start participating."
                  : "No players have been added to the system yet. Contact an administrator to add players."}
              </p>
            </div>
          ) : (
            <>
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`py-4 hover:bg-gray-50 transition-colors ${
                    player.team ? "border-l-4" : ""
                  }`}
                  style={{
                    borderLeftColor: player.team
                      ? getTeamColor(player.team)
                      : undefined,
                    backgroundColor: player.team
                      ? `${getTeamColor(player.team)}10`
                      : undefined,
                  }}
                >
                  <div className="flex items-center px-6">
                    <div className="w-12 sm:w-16 flex-shrink-0">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs font-semibold ${
                          index < 3
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {player.rank}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 hidden sm:flex">
                          <span className="text-xs font-bold text-blue-600">
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center min-w-0 flex-1">
                          <span className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                            {player.name}
                          </span>
                          {player.captainedTeams.length > 0 && (
                            <Star
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-500 ml-1 flex-shrink-0"
                              fill="currentColor"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-20 flex-shrink-0 text-center hidden sm:block">
                      <span className="text-xs sm:text-sm text-gray-600">
                        {formatExperience(player.experience)}
                      </span>
                    </div>

                    <div className="w-20 flex-shrink-0 text-center">
                      {player.team ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-medium truncate"
                          style={{
                            backgroundColor: `${getTeamColor(player.team)}20`,
                            color: getTeamColor(player.team),
                          }}
                        >
                          {getTeamAbbreviation(player.team)}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm text-gray-400">
                          FA
                        </span>
                      )}
                    </div>

                    <div className="w-16 flex-shrink-0 text-center">
                      <TrendIndicator trend={player.trend} />
                    </div>

                    <div className="w-16 sm:w-20 flex-shrink-0 text-center">
                      <span className="text-xs sm:text-sm font-semibold text-gray-900">
                        {player.eloRating}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="text-center mt-8">
        <p className="text-xs sm:text-sm text-gray-500">
          Rankings are updated in real-time based on Keep-Trade-Cut votes
          {selectedEventId && " for the selected event"}
        </p>
      </div>
    </div>
  );
}
