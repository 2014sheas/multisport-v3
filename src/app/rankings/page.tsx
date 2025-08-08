"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Vote,
  X,
  Check,
  XCircle,
  Star,
  TrendingDown,
  Minus,
  Heart,
  ArrowRight,
  Trash2,
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
  eloHistory: Array<{
    oldRating: number;
    newRating: number;
    timestamp: string;
  }>;
}

type VoteSelection = "keep" | "trade" | "cut";

export default function RankingsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [votingPlayers, setVotingPlayers] = useState<Player[]>([]);
  const [voteSelections, setVoteSelections] = useState<
    Record<string, VoteSelection | null>
  >({});
  const [voting, setVoting] = useState(false);
  const [voteMessage, setVoteMessage] = useState<string>("");

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      const response = await fetch("/api/rankings");
      const data = await response.json();
      setPlayers(data.players);
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  const startVoting = async () => {
    try {
      const response = await fetch("/api/players/random");
      const data = await response.json();
      setVotingPlayers(data.players);
      setVoteSelections({});
      setVoteMessage("");
      setShowVoteModal(true);
    } catch (error) {
      console.error("Error fetching random players:", error);
    }
  };

  const handlePlayerSelection = (
    playerId: string,
    selection: VoteSelection
  ) => {
    // Clear any existing selection for this player
    const newSelections = { ...voteSelections };

    // If this player was already selected with this choice, deselect it
    if (newSelections[playerId] === selection) {
      newSelections[playerId] = null;
    } else {
      // Clear any other player that had this selection
      Object.keys(newSelections).forEach((id) => {
        if (newSelections[id] === selection) {
          newSelections[id] = null;
        }
      });
      // Set the new selection
      newSelections[playerId] = selection;
    }

    setVoteSelections(newSelections);
  };

  const canSubmitVote = () => {
    const selections = Object.values(voteSelections).filter(Boolean);
    return (
      selections.length === 3 &&
      selections.includes("keep") &&
      selections.includes("trade") &&
      selections.includes("cut")
    );
  };

  const getVoteData = () => {
    const keepId = Object.keys(voteSelections).find(
      (id) => voteSelections[id] === "keep"
    );
    const tradeId = Object.keys(voteSelections).find(
      (id) => voteSelections[id] === "trade"
    );
    const cutId = Object.keys(voteSelections).find(
      (id) => voteSelections[id] === "cut"
    );

    return { keepId, tradeId, cutId };
  };

  const submitVote = async () => {
    if (!canSubmitVote()) {
      setVoteMessage(
        "Please select one player to keep, one player to trade, and one player to cut"
      );
      return;
    }

    const { keepId, tradeId, cutId } = getVoteData();

    if (!keepId || !tradeId || !cutId) {
      setVoteMessage("Invalid vote selection");
      return;
    }

    setVoting(true);
    setVoteMessage("");

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voterSession: `session_${Date.now()}`, // Generate a unique session
          keepId,
          tradeId,
          cutId,
        }),
      });

      if (response.ok) {
        setVoteMessage("Vote submitted successfully!");

        // Clear selections and fetch new random players after a short delay
        setTimeout(async () => {
          setVoteSelections({});
          setVoteMessage("");

          try {
            const newResponse = await fetch("/api/players/random");
            const newData = await newResponse.json();
            setVotingPlayers(newData.players);

            // Refresh rankings in the background
            fetchRankings();
          } catch (error) {
            console.error("Error fetching new random players:", error);
            setVoteMessage("Error loading new players");
          }
        }, 300); // Very fast transition - just enough time to see the success message
      } else {
        const errorData = await response.json();
        setVoteMessage(errorData.error || "Failed to submit vote");
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      setVoteMessage("Failed to submit vote");
    } finally {
      setVoting(false);
    }
  };

  const getSelectionIcon = (selection: VoteSelection) => {
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
          <Minus className="w-4 h-4 mr-1" />
          <span className="text-sm">No change</span>
        </div>
      );
    } else if (trend > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span className="text-sm">+{trend}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="w-4 h-4 mr-1" />
          <span className="text-sm">{trend}</span>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Players</h1>
        <p className="text-gray-600 mb-6">
          Current Values and performance history
        </p>
        <button
          onClick={startVoting}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Vote className="w-4 h-4 mr-2" />
          Vote on Players
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wide">
            <div className="col-span-1">Rank</div>
            <div className="col-span-3">Player</div>
            <div className="col-span-2">Value</div>
            <div className="col-span-2">Experience</div>
            <div className="col-span-4">24h Trend</div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      index < 3
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {player.rank}
                  </span>
                </div>

                <div className="col-span-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-blue-600">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">
                        {player.name}
                      </span>
                      {player.captainedTeams.length > 0 && (
                        <Star
                          className="w-4 h-4 text-yellow-500 ml-1"
                          fill="currentColor"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {player.eloRating}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-sm text-gray-600">
                    {formatExperience(player.experience)}
                  </span>
                </div>

                <div className="col-span-4">
                  <TrendIndicator trend={player.trend} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Rankings are updated in real-time based on Keep-Trade-Cut votes
        </p>
      </div>

      {/* Voting Modal */}
      {showVoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Keep-Trade-Cut Vote
              </h3>
              <button
                onClick={() => setShowVoteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Select your choices for these three players:
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Heart
                    className="w-4 h-4 text-green-600 mr-1"
                    fill="currentColor"
                  />
                  <span>Keep (Best)</span>
                </div>
                <div className="flex items-center">
                  <ArrowRight className="w-4 h-4 text-yellow-600 mr-1" />
                  <span>Trade (Middle)</span>
                </div>
                <div className="flex items-center">
                  <Trash2 className="w-4 h-4 text-red-600 mr-1" />
                  <span>Cut (Worst)</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              {votingPlayers.map((player) => {
                const selection = voteSelections[player.id];
                return (
                  <div
                    key={player.id}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selection
                        ? selection === "keep"
                          ? "border-green-500 bg-green-50"
                          : selection === "trade"
                          ? "border-yellow-500 bg-yellow-50"
                          : "border-red-500 bg-red-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {player.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatExperience(player.experience)}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handlePlayerSelection(player.id, "keep")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg text-sm font-medium transition-colors ${
                          selection === "keep"
                            ? "bg-green-100 text-green-700 border-2 border-green-500"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent"
                        }`}
                      >
                        <Heart className="w-5 h-5 mb-1" />
                        <span>Keep</span>
                      </button>
                      <button
                        onClick={() =>
                          handlePlayerSelection(player.id, "trade")
                        }
                        className={`flex flex-col items-center justify-center p-3 rounded-lg text-sm font-medium transition-colors ${
                          selection === "trade"
                            ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-500"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent"
                        }`}
                      >
                        <ArrowRight className="w-5 h-5 mb-1" />
                        <span>Trade</span>
                      </button>
                      <button
                        onClick={() => handlePlayerSelection(player.id, "cut")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg text-sm font-medium transition-colors ${
                          selection === "cut"
                            ? "bg-red-100 text-red-700 border-2 border-red-500"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent"
                        }`}
                      >
                        <Trash2 className="w-5 h-5 mb-1" />
                        <span>Cut</span>
                      </button>
                    </div>

                    {selection && (
                      <div className="mt-3 flex items-center justify-center text-sm">
                        {getSelectionIcon(selection)}
                        <span className="ml-1 font-medium">
                          Selected as: {getSelectionLabel(selection)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {voteMessage && (
              <div
                className={`mb-4 p-3 rounded-md ${
                  voteMessage.includes("successfully")
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {voteMessage}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowVoteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitVote}
                disabled={voting || !canSubmitVote()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {voting ? "Submitting..." : "Submit Vote"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
