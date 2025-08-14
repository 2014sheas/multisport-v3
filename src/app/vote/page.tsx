"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Heart,
  ArrowRight,
  Trash2,
  RefreshCw,
  Users,
  Calendar,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  eloRating: number;
  experience: number;
  team?: {
    id: string;
    name: string;
    color: string;
    abbreviation?: string;
  } | null;
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

type VoteSelection = "keep" | "trade" | "cut";

interface VoteSelections {
  keep: string | null;
  trade: string | null;
  cut: string | null;
}

interface VoteData {
  keepId: string;
  tradeId: string;
  cutId: string;
  eventId: string;
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

export default function VotePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [currentPlayers, setCurrentPlayers] = useState<Player[]>([]);
  const [nextPlayers, setNextPlayers] = useState<Player[]>([]);
  const [voteSelections, setVoteSelections] = useState<VoteSelections>({
    keep: null,
    trade: null,
    cut: null,
  });
  const [voting, setVoting] = useState(false);
  const [voteMessage, setVoteMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [displayPlayers, setDisplayPlayers] = useState<Player[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isRandomMode, setIsRandomMode] = useState(true);
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Pre-fetch next vote set for instant transitions
  const preFetchNextVoteSet = useCallback(
    async (excludeIds: string[] = []) => {
      try {
        const excludeParam = excludeIds.length > 0 ? excludeIds.join(",") : "";
        const url = `/api/players/random?eventId=${selectedEventId}&count=3&excludeIds=${excludeParam}`;

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.players) {
          setNextPlayers(data.players);
        }
      } catch (error) {
        console.error("Error pre-fetching next vote set:", error);
      }
    },
    [selectedEventId]
  );

  // Fetch initial players
  const fetchInitialPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/players/random?eventId=${selectedEventId}&count=3`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.players) {
        setCurrentPlayers(data.players);
        setDisplayPlayers(data.players);
        // Pre-fetch next set
        await preFetchNextVoteSet(data.players.map((p: Player) => p.id));
      }
    } catch (error) {
      console.error("Error fetching initial players:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, preFetchNextVoteSet]);

  // Fetch events on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events");
        const data = await response.json();
        setEvents(data.events || []);

        // Randomly select an event if available
        if (data.events && data.events.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.events.length);
          const randomEvent = data.events[randomIndex];
          setSelectedEventId(randomEvent.id);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, []);

  // Fetch players when event changes
  useEffect(() => {
    if (selectedEventId) {
      fetchInitialPlayers();
    }
  }, [selectedEventId, fetchInitialPlayers]);

  const canSubmitVote = useMemo(() => {
    return voteSelections.keep && voteSelections.trade && voteSelections.cut;
  }, [voteSelections]);

  const transitionToNextPlayers = async () => {
    if (nextPlayers.length === 3) {
      setCurrentPlayers(nextPlayers);
      setDisplayPlayers(nextPlayers);
      setVoteSelections({ keep: null, trade: null, cut: null });
      setVoteMessage("");

      // Pre-fetch next set
      await preFetchNextVoteSet(nextPlayers.map((p: Player) => p.id));
    } else {
      // Fallback: fetch new players
      await fetchInitialPlayers();
    }
  };

  // Submit vote
  const submitVote = useCallback(async () => {
    if (!canSubmitVote || !selectedEventId) return;

    setVoting(true);

    try {
      const voteData: VoteData = {
        keepId: voteSelections.keep!,
        tradeId: voteSelections.trade!,
        cutId: voteSelections.cut!,
        eventId: selectedEventId,
      };

      const response = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...voteData,
          voterSession: sessionId,
        }),
      });

      if (response.ok) {
        setTotalVotes((prev) => prev + 1);
        setVoteMessage("Vote submitted successfully! Loading next set...");

        // If in random mode, randomize the event after each vote
        if (isRandomMode && events.length > 0) {
          const randomIndex = Math.floor(Math.random() * events.length);
          const randomEvent = events[randomIndex];
          setSelectedEventId(randomEvent.id);
        }

        await transitionToNextPlayers();
      } else {
        const errorData = await response.json();
        setVoteMessage(
          `Failed to submit vote: ${errorData.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      setVoteMessage("Failed to submit vote");
    } finally {
      setVoting(false);
    }
  }, [canSubmitVote, selectedEventId, voteSelections, sessionId]);

  const handlePlayerSelection = (
    playerId: string,
    selection: VoteSelection
  ) => {
    setVoteSelections((prev) => ({
      ...prev,
      [selection]: prev[selection] === playerId ? null : playerId,
    }));
  };

  const getSelectionIcon = (selection: VoteSelection) => {
    switch (selection) {
      case "keep":
        return <Heart className="w-4 h-4 text-green-600" />;
      case "trade":
        return <ArrowRight className="w-4 h-4 text-yellow-600" />;
      case "cut":
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getSelectionLabel = (selection: VoteSelection) => {
    switch (selection) {
      case "keep":
        return "Keep";
      case "trade":
        return "Trade";
      case "cut":
        return "Cut";
      default:
        return "";
    }
  };

  const formatExperience = (experience: number) => {
    if (experience === 0) return "Rookie";
    if (experience === 1) return "1 Season";
    return `${experience} Seasons`;
  };

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Update selectedEvent when events or selectedEventId changes
  useEffect(() => {
    if (events.length > 0 && selectedEventId) {
      const event = events.find((e) => e.id === selectedEventId);
      setSelectedEvent(event || null);
    } else {
      setSelectedEvent(null);
    }
  }, [events, selectedEventId]);

  // Function to get a new random event
  const getNewRandomEvent = () => {
    if (events.length > 0) {
      const randomIndex = Math.floor(Math.random() * events.length);
      const randomEvent = events[randomIndex];
      setSelectedEventId(randomEvent.id);
      setIsRandomMode(true);
    }
  };

  // Function to refresh players based on current mode
  const refreshPlayers = async () => {
    if (events.length === 0) return;

    try {
      setLoading(true);

      if (isRandomMode) {
        // In random mode, randomize the event
        const randomIndex = Math.floor(Math.random() * events.length);
        const randomEvent = events[randomIndex];
        setSelectedEventId(randomEvent.id);
      }
      // If not in random mode, keep the same event but fetch new players

      // Fetch new random players for the current event
      const url = `/api/players/random?eventId=${selectedEventId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setDisplayPlayers(data.players);
        setVoteSelections({
          keep: null,
          trade: null,
          cut: null,
        });
        setVoteMessage("");
      } else {
        setVoteMessage("Failed to load new players");
      }
    } catch (error) {
      console.error("Error refreshing players:", error);
      setVoteMessage("Failed to refresh players");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
            Player Voting
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 mb-4 sm:mb-6">
            Help rank players by voting on who to keep, trade, or cut
          </p>

          {/* Back to Rankings Link */}
          <div className="mb-4 sm:mb-6">
            <a
              href="/rankings"
              className="inline-flex items-center px-3 sm:px-4 py-2 text-sm sm:text-base text-blue-600 hover:text-blue-700 font-medium transition-colors hover:bg-blue-50 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Back to Rankings
              {!isRandomMode && selectedEvent && (
                <span className="ml-2 text-xs text-gray-500">
                  ({selectedEvent.symbol} {selectedEvent.name})
                </span>
              )}
            </a>
          </div>

          {/* Event Selection */}
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-4 sm:mb-6">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            <select
              value={selectedEventId}
              onChange={(e) => {
                if (e.target.value === "random") {
                  // Select a random event and enter random mode
                  const randomIndex = Math.floor(Math.random() * events.length);
                  const randomEvent = events[randomIndex];
                  setSelectedEventId(randomEvent.id);
                  setIsRandomMode(true);
                } else {
                  // User manually selected an event, exit random mode
                  setSelectedEventId(e.target.value);
                  setIsRandomMode(false);
                }
              }}
              className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            >
              <option value="random">🎲 Random Event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.symbol} {event.name}
                </option>
              ))}
            </select>
            <button
              onClick={getNewRandomEvent}
              className="px-2 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Get a different random event"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center space-x-4 sm:space-x-6 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{totalVotes} votes submitted</span>
            </div>
          </div>
        </div>

        {/* Voting Interface */}
        {!selectedEventId ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-gray-500 mb-2 sm:mb-4 text-sm sm:text-base">
              Loading events...
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            {/* Show loading state only for initial load */}
            {loading && displayPlayers.length === 0 ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
                <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-600">
                  Loading players...
                </span>
              </div>
            ) : (
              <>
                {/* Event Header */}
                {selectedEvent && (
                  <div className="text-center mb-3 sm:mb-4 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                      <span className="text-2xl sm:text-3xl">
                        {selectedEvent.symbol}
                      </span>
                      <div className="text-left">
                        <h2 className="text-sm sm:text-lg font-bold text-gray-900">
                          {selectedEvent.name}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600"></p>
                      </div>
                    </div>
                    {isRandomMode && (
                      <div className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full inline-block">
                        🎲 Random Mode
                      </div>
                    )}
                  </div>
                )}

                {/* Player Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {displayPlayers.map((player) => {
                    const selection = Object.entries(voteSelections).find(
                      ([_, playerId]) => playerId === player.id
                    )?.[0] as VoteSelection;

                    return (
                      <div
                        key={player.id}
                        className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 ${
                          selection
                            ? selection === "keep"
                              ? "border-green-500 bg-green-50"
                              : selection === "trade"
                              ? "border-yellow-500 bg-yellow-50"
                              : "border-red-500 bg-red-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                              {player.name}
                            </h3>
                            <div className="flex items-center mt-1">
                              {player.team ? (
                                <div
                                  className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium text-white"
                                  style={{
                                    backgroundColor: getTeamColor(player.team),
                                  }}
                                >
                                  {player.team.name}
                                </div>
                              ) : (
                                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-200">
                                  Free Agent
                                </span>
                              )}
                            </div>
                          </div>
                          {selection && (
                            <div className="flex items-center text-xs sm:text-sm">
                              {getSelectionIcon(selection)}
                              <span
                                className={`ml-1 sm:ml-2 font-medium ${
                                  selection === "keep"
                                    ? "text-green-700"
                                    : selection === "trade"
                                    ? "text-yellow-700"
                                    : "text-red-700"
                                }`}
                              >
                                {getSelectionLabel(selection)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1 sm:gap-2">
                          <button
                            onClick={() =>
                              handlePlayerSelection(player.id, "keep")
                            }
                            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                              selection === "keep"
                                ? "bg-green-100 text-green-700 border border-green-500"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                            }`}
                          >
                            <Heart className="w-3 h-3 sm:w-4 sm:h-4 mb-0.5 sm:mb-1" />
                            <span>Keep</span>
                          </button>
                          <button
                            onClick={() =>
                              handlePlayerSelection(player.id, "trade")
                            }
                            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                              selection === "trade"
                                ? "bg-yellow-100 text-yellow-700 border border-yellow-500"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                            }`}
                          >
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 mb-0.5 sm:mb-1" />
                            <span>Trade</span>
                          </button>
                          <button
                            onClick={() =>
                              handlePlayerSelection(player.id, "cut")
                            }
                            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                              selection === "cut"
                                ? "bg-red-100 text-red-700 border border-red-500"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                            }`}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mb-0.5 sm:mb-1" />
                            <span>Cut</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vote Message */}
                {voteMessage && (
                  <div
                    className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded text-xs sm:text-sm ${
                      voteMessage.includes("successfully")
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {voteMessage}
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-center">
                  <button
                    onClick={submitVote}
                    disabled={voting || !canSubmitVote}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg text-base sm:text-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {voting ? (
                      <div className="flex items-center">
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-1.5 sm:mr-2" />
                        Submitting...
                      </div>
                    ) : (
                      "Submit Vote"
                    )}
                  </button>
                </div>

                {/* Skip Link */}
                <div className="text-center mt-3 sm:mt-4">
                  <button
                    onClick={refreshPlayers}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-700 text-sm sm:text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-1.5 sm:mr-2" />
                        Loading new players...
                      </div>
                    ) : (
                      "I don&apos;t know all of these players (skip)"
                    )}
                  </button>
                </div>

                {/* Instructions */}
                <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
                  <p>Select one player to keep, one to trade, and one to cut</p>
                  <p>
                    Your votes help determine player rankings and team
                    compositions
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
