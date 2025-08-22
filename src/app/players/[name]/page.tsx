"use client";

import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Trophy,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Player {
  id: string;
  name: string;
  experience: number;
  wins: number;
  eloRating: number;
  globalRank?: number;
  profilePicture?: string | null;
  team: {
    id: string;
    name: string;
    color: string;
    abbreviation: string;
  } | null;
  isCaptain: boolean;
}

interface PlayerRanking {
  eventId: string;
  eventName: string;
  eventAbbreviation: string;
  eventSymbol: string;
  rating: number;
  globalRank: number;
  trend: number;
  gamesPlayed: number;
}

interface RatingHistory {
  timestamp: string;
  rating: number;
}

interface EventHistory {
  eventId: string;
  eventName: string;
  eventAbbreviation: string;
  eventSymbol: string;
  history: RatingHistory[];
  voteCount: number;
}

interface HistoryData {
  overallHistory: RatingHistory[];
  eventHistories: EventHistory[];
  overallVoteCount: number;
  events: Array<{
    id: string;
    name: string;
    abbreviation: string;
    symbol: string;
  }>;
}

export default function PlayerPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<string>("overall");
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState<string>("");

  useEffect(() => {
    const getParams = async () => {
      const { name } = await params;
      setPlayerName(decodeURIComponent(name));
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (playerName) {
      fetchPlayerData();
      fetchPlayerRankings();
      fetchPlayerHistory();
    }
  }, [playerName]);

  const fetchPlayerData = async () => {
    try {
      const response = await fetch(
        `/api/players/by-name/${encodeURIComponent(playerName)}`
      );
      if (!response.ok) {
        throw new Error("Player not found");
      }
      const data = await response.json();
      setPlayer(data.player);
    } catch (error) {
      console.error("Error fetching player data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerRankings = async () => {
    try {
      const response = await fetch(
        `/api/players/by-name/${encodeURIComponent(playerName)}/rankings`
      );
      if (response.ok) {
        const data = await response.json();
        setRankings(data.rankings || []);
      }
    } catch (error) {
      console.error("Error fetching player rankings:", error);
    }
  };

  const fetchPlayerHistory = async () => {
    try {
      const response = await fetch(
        `/api/players/by-name/${encodeURIComponent(playerName)}/history`
      );
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data);
      }
    } catch (error) {
      console.error("Error fetching player history:", error);
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

  const formatExperience = (years: number) => {
    if (years === 0) {
      return "Rookie";
    } else if (years === 1) {
      return "1st year";
    } else if (years === 2) {
      return "2nd year";
    } else if (years === 3) {
      return "3rd year";
    } else {
      return `${years}th year`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Player Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The player you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/rankings"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Rankings
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
          href="/rankings"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Rankings
        </Link>
      </div>

      {/* Player Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-start justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                {player.profilePicture ? (
                  <img
                    src={player.profilePicture}
                    alt={player.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  {player.name}
                </h1>
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {player.team && (
                    <Link
                      href={`/teams/${player.team.abbreviation}`}
                      className="inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: `${player.team.color}20`,
                        color: player.team.color,
                        border: `1px solid ${player.team.color}40`,
                      }}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {player.team.name}
                    </Link>
                  )}
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full bg-purple-100 text-purple-800">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatExperience(player.experience)}
                  </span>
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full bg-green-100 text-green-800">
                    <Trophy className="w-3 h-3 mr-1" />
                    {player.wins} wins
                  </span>
                  {player.isCaptain && (
                    <span className="inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      <Star className="w-3 h-3 mr-1" />
                      Captain
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Player Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                {player.eloRating}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">
                Overall Rating
              </div>
              <div className="text-sm font-semibold text-gray-700">
                #{player.globalRank || "N/A"}
              </div>
              <div className="text-xs text-gray-500">Overall Rank</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rankings Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Event Rankings
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {rankings.length > 0 ? (
            rankings.map((ranking) => (
              <div
                key={ranking.eventId}
                className="py-4 px-4 sm:px-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Event Info */}
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl sm:text-3xl">
                        {ranking.eventSymbol}
                      </span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm sm:text-base font-medium text-gray-900">
                            {ranking.eventName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    {/* Global Rank */}
                    <div className="text-center">
                      <p className="text-sm sm:text-base font-semibold text-gray-900">
                        #{ranking.globalRank}
                      </p>
                      <p className="text-xs text-gray-500">Overall Rank</p>
                    </div>

                    {/* Rating */}
                    <div className="text-center">
                      <p className="text-sm sm:text-base font-semibold text-gray-900">
                        {ranking.rating}
                      </p>
                      <p className="text-xs text-gray-500">Rating</p>
                    </div>

                    {/* 24h Trend */}
                    <div className="text-center">
                      <TrendIndicator trend={ranking.trend} />
                      <p className="text-xs text-gray-500">24h Trend</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              No event rankings found for this player.
            </div>
          )}
        </div>
      </div>

      {/* Rating History Chart */}
      {historyData && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6 sm:mb-8">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Rating History
            </h2>

            {/* Debug Info */}
            <div className="mt-2 text-xs text-gray-500">
              {selectedHistory === "overall" ? (
                <div>
                  <p className="text-xs text-gray-500 mt-1">
                    Total votes: {historyData.overallVoteCount || 0}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 mt-1">
                    {
                      historyData.events.find((e) => e.id === selectedHistory)
                        ?.name
                    }
                    {" votes: "}
                    {historyData.eventHistories.find(
                      (eh) => eh.eventId === selectedHistory
                    )?.voteCount || 0}
                  </p>
                </div>
              )}
            </div>

            {/* History Type Selector */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedHistory("overall")}
                className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                  selectedHistory === "overall"
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Overall Rating
              </button>
              {historyData.events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedHistory(event.id)}
                  className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                    selectedHistory === event.id
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {event.symbol} {event.name}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Container */}
          {historyData.overallHistory.length > 0 ||
          historyData.eventHistories.some((eh) => eh.history.length > 0) ? (
            <div className="p-4 sm:p-6">
              <div className="h-48 sm:h-64 md:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={
                      selectedHistory === "overall"
                        ? historyData.overallHistory
                        : historyData.eventHistories.find(
                            (eh) => eh.eventId === selectedHistory
                          )?.history || []
                    }
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                      fontSize={12}
                    />
                    <YAxis
                      domain={["dataMin - 100", "dataMax + 100"]}
                      fontSize={12}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                      formatter={(value: number) => [value, "Rating"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                      activeDot={{
                        r: 6,
                        stroke: "#3B82F6",
                        strokeWidth: 2,
                        fill: "#fff",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>No rating history data available</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {rankings.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Trophy className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No rankings yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            This player hasn&apos;t participated in any events yet.
          </p>
        </div>
      )}
    </div>
  );
}
