"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Heart, ArrowRight, Trash2, X, RefreshCw } from "lucide-react";

interface Player {
  id: string;
  name: string;
  eloRating: number;
  experience: number;
}

interface Event {
  id: string;
  name: string;
  symbol: string;
}

interface VoteSelection {
  keep: string | null;
  trade: string | null;
  cut: string | null;
}

interface OptimizedVotingInterfaceProps {
  events: Event[];
  selectedEventId: string;
  onVoteSubmit: (voteData: {
    keepId: string;
    tradeId: string;
    cutId: string;
    eventId: string;
  }) => Promise<void>;
  onClose: () => void;
}

export default function OptimizedVotingInterface({
  events,
  selectedEventId,
  onVoteSubmit,
  onClose,
}: OptimizedVotingInterfaceProps) {
  const [currentPlayers, setCurrentPlayers] = useState<Player[]>([]);
  const [nextPlayers, setNextPlayers] = useState<Player[]>([]);
  const [votingEventId, setVotingEventId] = useState<string>(selectedEventId);
  const [voteSelections, setVoteSelections] = useState<VoteSelection>({
    keep: null,
    trade: null,
    cut: null,
  });
  const [voting, setVoting] = useState(false);
  const [voteMessage, setVoteMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [displayPlayers, setDisplayPlayers] = useState<Player[]>([]);

  // Pre-fetch next vote set for instant transitions
  const preFetchNextVoteSet = useCallback(
    async (excludeIds: string[] = []) => {
      try {
        const excludeParam = excludeIds.length > 0 ? excludeIds.join(",") : "";
        const url = `/api/players/random?eventId=${votingEventId}&count=3&excludeIds=${excludeParam}`;

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.players) {
          setNextPlayers(data.players);
        }
      } catch (error) {
        console.error("Error pre-fetching next vote set:", error);
      }
    },
    [votingEventId]
  );

  // Fetch initial players
  const fetchInitialPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/players/random?eventId=${votingEventId}&count=3`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.players) {
        setCurrentPlayers(data.players);
        setDisplayPlayers(data.players);
        await preFetchNextVoteSet(data.players.map((p: Player) => p.id));
      }
    } catch (error) {
      console.error("Error fetching initial players:", error);
      setVoteMessage("Error loading players");
    } finally {
      setLoading(false);
    }
  }, [votingEventId, preFetchNextVoteSet]);

  // Handle event change
  const handleEventChange = useCallback(
    async (newEventId: string) => {
      setVotingEventId(newEventId);
      setVoteSelections({ keep: null, trade: null, cut: null });
      setVoteMessage("");

      // Fetch new players for the selected event WITHOUT loading state
      try {
        const url = `/api/players/random?eventId=${newEventId}&count=3`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.players) {
          setCurrentPlayers(data.players);
          setDisplayPlayers(data.players);
          await preFetchNextVoteSet(data.players.map((p: Player) => p.id));
        }
      } catch (error) {
        console.error("Error fetching players for event:", error);
      }
    },
    [preFetchNextVoteSet]
  );

  // Initialize
  useEffect(() => {
    if (votingEventId && displayPlayers.length === 0) {
      fetchInitialPlayers();
    }
  }, [votingEventId, fetchInitialPlayers, displayPlayers.length]);

  // Get selected event name
  const getSelectedEventName = useCallback(() => {
    const event = events.find((e) => e.id === votingEventId);
    return event ? `${event.symbol} ${event.name}` : "Unknown Event";
  }, [events, votingEventId]);

  // Format experience
  const formatExperience = useCallback((years: number | undefined) => {
    const experienceYears = years ?? 0;
    if (experienceYears === 0) return "Rookie";
    if (experienceYears === 1) return "1st year";
    if (experienceYears === 2) return "2nd year";
    if (experienceYears === 3) return "3rd year";
    return `${experienceYears}th year`;
  }, []);

  // Handle player selection
  const handlePlayerSelection = useCallback(
    (playerId: string, selection: keyof VoteSelection) => {
      setVoteSelections((prev) => {
        const newSelections = { ...prev };

        // Clear any existing selection for this player
        Object.keys(newSelections).forEach((key) => {
          if (newSelections[key as keyof VoteSelection] === playerId) {
            newSelections[key as keyof VoteSelection] = null;
          }
        });

        // If this player was already selected with this choice, deselect it
        if (newSelections[selection] === playerId) {
          newSelections[selection] = null;
        } else {
          // Set the new selection
          newSelections[selection] = playerId;
        }

        return newSelections;
      });
    },
    []
  );

  // Check if vote can be submitted
  const canSubmitVote = useMemo(() => {
    return voteSelections.keep && voteSelections.trade && voteSelections.cut;
  }, [voteSelections]);

  // Get selection icon
  const getSelectionIcon = useCallback((selection: keyof VoteSelection) => {
    switch (selection) {
      case "keep":
        return <Heart className="w-5 h-5 text-green-600" fill="currentColor" />;
      case "trade":
        return <ArrowRight className="w-5 h-5 text-yellow-600" />;
      case "cut":
        return <Trash2 className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  }, []);

  // Get selection label
  const getSelectionLabel = useCallback((selection: keyof VoteSelection) => {
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
  }, []);

  // Seamless transition to next players
  const transitionToNextPlayers = useCallback(async () => {
    if (nextPlayers.length > 0) {
      setCurrentPlayers(nextPlayers);
      setDisplayPlayers(nextPlayers);
      setVoteSelections({ keep: null, trade: null, cut: null });

      preFetchNextVoteSet(nextPlayers.map((p: Player) => p.id));
    } else {
      // Fallback: fetch new players without loading states
      try {
        const url = `/api/players/random?eventId=${votingEventId}&count=3`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.players) {
          setCurrentPlayers(data.players);
          setDisplayPlayers(data.players);
          await preFetchNextVoteSet(data.players.map((p: Player) => p.id));
        } else {
          // Keep current players if fetch fails
        }
      } catch (error) {
        console.error("Error fetching players for transition:", error);
        // Keep current players if fetch fails
      }
    }
  }, [nextPlayers, votingEventId, preFetchNextVoteSet]);

  // Submit vote
  const submitVote = useCallback(async () => {
    if (!canSubmitVote || !votingEventId) return;

    setVoting(true);

    try {
      await onVoteSubmit({
        keepId: voteSelections.keep!,
        tradeId: voteSelections.trade!,
        cutId: voteSelections.cut!,
        eventId: votingEventId,
      });

      await transitionToNextPlayers();
    } catch (error) {
      console.error("Error submitting vote:", error);
      setVoteMessage("Failed to submit vote");
    } finally {
      setVoting(false);
    }
  }, [
    canSubmitVote,
    votingEventId,
    voteSelections,
    onVoteSubmit,
    transitionToNextPlayers,
  ]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`bg-white rounded-lg p-4 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto transition-all duration-300`}
      >
        {/* Show loading state only for initial load */}
        {loading && displayPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading players...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Keep-Trade-Cut Vote
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Selection */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voting for:
              </label>
              <select
                value={votingEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.symbol} {event.name}
                  </option>
                ))}
              </select>
              {!selectedEventId && votingEventId && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-700">
                    🎲 <strong>Randomly selected:</strong>{" "}
                    {getSelectedEventName()}
                    (You can change this above if you prefer a different event)
                  </p>
                </div>
              )}
            </div>

            {/* Players */}
            <div className="space-y-2 mb-3">
              {displayPlayers.map((player) => {
                const isKeep = voteSelections.keep === player.id;
                const isTrade = voteSelections.trade === player.id;
                const isCut = voteSelections.cut === player.id;

                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      isKeep
                        ? "border-green-500 bg-green-50 shadow-sm"
                        : isTrade
                        ? "border-yellow-500 bg-yellow-50 shadow-sm"
                        : isCut
                        ? "border-red-500 bg-red-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {player.name}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {formatExperience(player.experience)}
                        </p>
                      </div>
                      {(isKeep || isTrade || isCut) && (
                        <div className="flex items-center text-xs">
                          {isKeep && getSelectionIcon("keep")}
                          {isTrade && getSelectionIcon("trade")}
                          {isCut && getSelectionIcon("cut")}
                          <span className="ml-1 font-medium">
                            {isKeep && getSelectionLabel("keep")}
                            {isTrade && getSelectionLabel("trade")}
                            {isCut && getSelectionLabel("cut")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePlayerSelection(player.id, "keep")}
                        className={`flex flex-col items-center justify-center p-2 rounded text-xs font-medium transition-all duration-200 ${
                          isKeep
                            ? "bg-green-100 text-green-700 border border-green-500 shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent hover:border-green-300"
                        }`}
                      >
                        <Heart className="w-3 h-3 mb-0.5" />
                        <span>Keep</span>
                      </button>
                      <button
                        onClick={() =>
                          handlePlayerSelection(player.id, "trade")
                        }
                        className={`flex flex-col items-center justify-center p-2 rounded text-xs font-medium transition-all duration-200 ${
                          isTrade
                            ? "bg-yellow-100 text-yellow-700 border border-yellow-500 shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent hover:border-yellow-300"
                        }`}
                      >
                        <ArrowRight className="w-3 h-3 mb-0.5" />
                        <span>Trade</span>
                      </button>
                      <button
                        onClick={() => handlePlayerSelection(player.id, "cut")}
                        className={`flex flex-col items-center justify-center p-2 rounded text-xs font-medium transition-all duration-200 ${
                          isCut
                            ? "bg-red-100 text-red-700 border border-red-500 shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent hover:border-red-300"
                        }`}
                      >
                        <Trash2 className="w-3 h-3 mb-0.5" />
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
                className={`mb-3 p-2 rounded text-xs transition-all duration-200 ${
                  voteMessage.includes("successfully")
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {voteMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitVote}
                disabled={voting || !canSubmitVote}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {voting ? "Submitting..." : "Submit Vote"}
              </button>
            </div>

            {/* Performance Indicator */}
            <div className="mt-3 text-xs text-gray-500 text-center">
              ⚡ Optimized for instant transitions
            </div>
          </>
        )}
      </div>
    </div>
  );
}
