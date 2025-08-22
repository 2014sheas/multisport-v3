"use client";

import { useState, useEffect } from "react";
import { Trophy, Users, Target, Save } from "lucide-react";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  averageRating: number;
  members?: {
    playerId: string;
    playerName: string;
    rating: number;
    globalRank: number | null;
    trend: number;
  }[];
}

interface CombinedTeamMatchProps {
  eventId: string;
  teams: Team[];
  isAdmin: boolean;
  eventStatus: "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
  onMatchComplete?: (winner: string, score: [number, number]) => void;
  onStartEvent?: () => void;
}

export default function CombinedTeamMatch({
  eventId,
  teams,
  isAdmin,
  eventStatus,
  onMatchComplete,
  onStartEvent,
}: CombinedTeamMatchProps) {
  const [combinedTeams, setCombinedTeams] = useState<{
    team1: Team[];
    team2: Team[];
  } | null>(null);
  const [matchScore, setMatchScore] = useState<[number, number]>([0, 0]);
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  // Load combined teams data when component mounts
  useEffect(() => {
    const loadCombinedTeams = async () => {
      try {
        const response = await fetch(`/api/combined-team?eventId=${eventId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.combinedTeams) {
            // Handle the new data structure with teams and currentScore
            if (data.combinedTeams.teams) {
              setCombinedTeams(data.combinedTeams.teams);
              // Load the current score if it exists
              if (data.combinedTeams.currentScore) {
                setMatchScore(data.combinedTeams.currentScore);

                // For completed events, determine the winner from the score
                if (eventStatus === "COMPLETED") {
                  const [score1, score2] = data.combinedTeams.currentScore;
                  const winningTeam = score1 > score2 ? "team1" : "team2";
                  setWinner(winningTeam);
                }
              }
            } else {
              // Handle legacy data structure
              setCombinedTeams(data.combinedTeams);
            }
          }
        }
      } catch (error) {
        console.error("Error loading combined teams data:", error);
      }
    };

    if (eventId) {
      loadCombinedTeams();
    }
  }, [eventId, eventStatus]);

  const generateCombinedTeams = async () => {
    if (teams.length !== 4) return;

    try {
      // Randomly shuffle teams and create two combined teams
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      const team1 = shuffledTeams.slice(0, 2);
      const team2 = shuffledTeams.slice(2, 4);

      const combinedTeamsData = { team1, team2 };
      setCombinedTeams(combinedTeamsData);

      // Save the combined teams data to the database
      const response = await fetch("/api/combined-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          combinedTeams: combinedTeamsData,
          currentScore: [0, 0], // Initialize with 0-0 score
        }),
      });

      if (!response.ok) {
        console.error("Failed to save combined teams data");
      }
    } catch (error) {
      console.error("Error generating combined teams:", error);
    }
  };

  const handleScoreUpdate = async () => {
    if (!combinedTeams) return;

    const [score1, score2] = matchScore;
    const winningTeam = score1 > score2 ? "team1" : "team2";
    const winningTeams =
      winningTeam === "team1" ? combinedTeams.team1 : combinedTeams.team2;

    try {
      // Save the final score and mark the event as completed
      const response = await fetch("/api/combined-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          combinedTeams,
          currentScore: matchScore,
          status: "COMPLETED", // Mark the event as completed
        }),
      });

      if (response.ok) {
        setWinner(winningTeam);
        setShowScoreInput(false);

        if (onMatchComplete) {
          onMatchComplete(winningTeam, matchScore);
        }
      } else {
        console.error("Failed to complete match");
        alert("Failed to complete match. Please try again.");
      }
    } catch (error) {
      console.error("Error completing match:", error);
      alert("An error occurred while completing the match. Please try again.");
    }
  };

  const handleScoreSave = async () => {
    if (!combinedTeams) return;

    try {
      // Save the current score to the database without completing the match
      const response = await fetch("/api/combined-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          combinedTeams,
          currentScore: matchScore,
          status: "IN_PROGRESS", // Keep the event in progress
        }),
      });

      if (response.ok) {
        // Show success message
        alert("Score updated successfully!");
      } else {
        console.error("Failed to update score");
        alert("Failed to update score. Please try again.");
      }
    } catch (error) {
      console.error("Error updating score:", error);
      alert("An error occurred while updating the score. Please try again.");
    }
  };

  const getCombinedTeamName = (teams: Team[]) => {
    return teams.map((t) => t.abbreviation || t.name).join(" + ");
  };

  const getCombinedTeamColor = (teams: Team[]) => {
    // Use the first team's color as the primary color
    return teams[0]?.color || "#3B82F6";
  };

  const getCombinedTeamRating = (teams: Team[]) => {
    const totalRating = teams.reduce(
      (sum, team) => sum + team.averageRating,
      0
    );
    return Math.round(totalRating / teams.length);
  };

  const getCombinedTeamPlayers = (teams: Team[]) => {
    const allPlayers: {
      playerId: string;
      playerName: string;
      rating: number;
      globalRank: number | null;
      trend: number;
      originalTeam: {
        name: string;
        color: string;
      };
    }[] = [];

    teams.forEach((team) => {
      if (team.members) {
        const playersWithTeamInfo = team.members.map((player) => ({
          ...player,
          originalTeam: {
            name: team.name,
            color: team.color,
          },
        }));
        allPlayers.push(...playersWithTeamInfo);
      }
    });

    return allPlayers;
  };

  if (eventStatus === "UPCOMING") {
    return (
      <div className="text-center">
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            {isAdmin
              ? "Click the button below to randomly generate the combined teams."
              : "Waiting for admin to generate the combined teams."}
          </p>
          {isAdmin && (
            <button
              onClick={generateCombinedTeams}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Target className="w-4 h-4 mr-2" />
              Generate Combined Teams
            </button>
          )}
        </div>

        {combinedTeams && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Combined Team 1 */}
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <h3 className="font-semibold text-lg mb-3 text-gray-900">
                  Combined Team 1
                </h3>
                <div className="space-y-2">
                  {combinedTeams.team1.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-2 rounded border"
                      style={{ borderColor: `${team.color}40` }}
                    >
                      <span className="font-medium text-gray-900">
                        {team.name}
                      </span>
                      <span className="text-sm text-gray-600">
                        {Math.round(team.averageRating)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        Combined Rating:
                      </span>
                      <span
                        className="font-bold text-lg"
                        style={{
                          color: getCombinedTeamColor(combinedTeams.team1),
                        }}
                      >
                        {Math.round(getCombinedTeamRating(combinedTeams.team1))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Combined Team 2 */}
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <h3 className="font-semibold text-lg mb-3 text-gray-900">
                  Combined Team 2
                </h3>
                <div className="space-y-2">
                  {combinedTeams.team2.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-2 rounded border"
                      style={{ borderColor: `${team.color}40` }}
                    >
                      <span className="font-medium text-gray-900">
                        {team.name}
                      </span>
                      <span className="text-sm text-gray-600">
                        {Math.round(team.averageRating)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        Combined Rating:
                      </span>
                      <span
                        className="font-bold text-lg"
                        style={{
                          color: getCombinedTeamColor(combinedTeams.team2),
                        }}
                      >
                        {Math.round(getCombinedTeamRating(combinedTeams.team2))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Event Button for Admins */}
            {isAdmin && (
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Ready to Start Event
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    The combined teams have been generated. Click the button
                    below to start the event.
                  </p>
                  <button
                    onClick={() => onStartEvent && onStartEvent()}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Start Combined Team Event
                  </button>
                </div>
              </div>
            )}

            {/* Info for Non-Admin Users */}
            {!isAdmin && (
              <div className="text-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Teams Generated
                  </h3>
                  <p className="text-sm text-blue-700">
                    The combined teams have been generated and are ready for the
                    event to begin.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (eventStatus === "IN_PROGRESS") {
    return (
      <div className="text-center">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Combined Team Match in Progress
          </h3>

          {combinedTeams ? (
            <>
              {/* Current Score Display - Visible to All Users */}
              <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 text-center">
                  Current Score
                </h4>
                <div className="flex items-center justify-center space-x-6">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {getCombinedTeamName(combinedTeams.team1)}
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {matchScore[0]}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-500">vs</div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {getCombinedTeamName(combinedTeams.team2)}
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {matchScore[1]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Score Section - Admin Only */}
              {isAdmin && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 text-center">
                    Update Match Score
                  </h4>
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <div className="text-center">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        {getCombinedTeamName(combinedTeams.team1)}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={matchScore[0]}
                        onChange={(e) =>
                          setMatchScore([
                            parseInt(e.target.value) || 0,
                            matchScore[1],
                          ])
                        }
                        className="w-20 border border-gray-300 rounded-md px-3 py-2 text-center text-gray-900"
                      />
                    </div>
                    <span className="text-2xl font-bold text-gray-700">vs</span>
                    <div className="text-center">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        {getCombinedTeamName(combinedTeams.team2)}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={matchScore[1]}
                        onChange={(e) =>
                          setMatchScore([
                            matchScore[0],
                            parseInt(e.target.value) || 0,
                          ])
                        }
                        className="w-20 border border-gray-300 rounded-md px-3 py-2 text-center text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="text-center space-y-3">
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={handleScoreSave}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Update Score
                      </button>
                      <button
                        onClick={handleScoreUpdate}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        Complete Match
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      Use &quot;Update Score&quot; to save the current score
                      without ending the match, or &quot;Complete Match&quot; to
                      finish the event.
                    </p>
                  </div>
                </div>
              )}

              {/* Team Ratings and Players */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Combined Team 1 */}
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <h4 className="font-semibold text-lg mb-3 text-gray-900">
                    {getCombinedTeamName(combinedTeams.team1)}
                  </h4>
                  <div className="space-y-2 mb-4">
                    {combinedTeams.team1.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-2 rounded border"
                        style={{ borderColor: `${team.color}40` }}
                      >
                        <span className="font-medium text-gray-900">
                          {team.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {Math.round(team.averageRating)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Combined Team Rating */}
                  <div className="pt-2 border-t border-gray-200 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        Combined Rating:
                      </span>
                      <span className="font-bold text-lg text-blue-600">
                        {Math.round(getCombinedTeamRating(combinedTeams.team1))}
                      </span>
                    </div>
                  </div>

                  {/* Players List */}
                  <div className="border-t border-gray-200 pt-3">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">
                      Players
                    </h5>
                    <div className="space-y-2">
                      {getCombinedTeamPlayers(combinedTeams.team1)
                        .sort((a, b) => b.rating - a.rating)
                        .map((player) => (
                          <div
                            key={player.playerId}
                            className="flex items-center justify-between py-1 px-2 rounded text-sm border-l-2"
                            style={{
                              backgroundColor: `${player.originalTeam.color}15`,
                              borderLeftColor: player.originalTeam.color,
                            }}
                          >
                            <span className="font-medium text-gray-900">
                              {player.playerName}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">
                                #{player.globalRank || "N/A"}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {player.rating}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Combined Team 2 */}
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <h4 className="font-semibold text-lg mb-3 text-gray-900">
                    {getCombinedTeamName(combinedTeams.team2)}
                  </h4>
                  <div className="space-y-2 mb-4">
                    {combinedTeams.team2.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-2 rounded border"
                        style={{ borderColor: `${team.color}40` }}
                      >
                        <span className="font-medium text-gray-900">
                          {team.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {Math.round(team.averageRating)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Combined Team Rating */}
                  <div className="pt-2 border-t border-gray-200 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        Combined Rating:
                      </span>
                      <span className="font-bold text-lg text-blue-600">
                        {Math.round(getCombinedTeamRating(combinedTeams.team2))}
                      </span>
                    </div>
                  </div>

                  {/* Players List */}
                  <div className="border-t border-gray-200 pt-3">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">
                      Players
                    </h5>
                    <div className="space-y-2">
                      {getCombinedTeamPlayers(combinedTeams.team2)
                        .sort((a, b) => b.rating - a.rating)
                        .map((player) => (
                          <div
                            key={player.playerId}
                            className="flex items-center justify-between py-1 px-2 rounded text-sm border-l-2"
                            style={{
                              backgroundColor: `${player.originalTeam.color}15`,
                              borderLeftColor: player.originalTeam.color,
                            }}
                          >
                            <span className="font-medium text-gray-900">
                              {player.playerName}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">
                                #{player.globalRank || "N/A"}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {player.rating}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {isAdmin
                  ? "Teams need to be generated before the match can begin."
                  : "Waiting for admin to generate the combined teams."}
              </p>
              {isAdmin && (
                <button
                  onClick={generateCombinedTeams}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Generate Combined Teams
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (eventStatus === "COMPLETED") {
    return (
      <div className="text-center">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Combined Team Match Completed
          </h3>

          {winner && combinedTeams && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-green-600 mr-2" />
                <span className="text-xl font-bold text-green-800">
                  {winner === "team1"
                    ? getCombinedTeamName(combinedTeams.team1)
                    : getCombinedTeamName(combinedTeams.team2)}{" "}
                  Wins!
                </span>
              </div>

              <div className="text-lg text-green-700 mb-4">
                Final Score: {matchScore[0]} - {matchScore[1]}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {getCombinedTeamName(combinedTeams.team1)}
                  </h4>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: getCombinedTeamColor(combinedTeams.team1) }}
                  >
                    {matchScore[0]}
                  </p>
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {getCombinedTeamName(combinedTeams.team2)}
                  </h4>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: getCombinedTeamColor(combinedTeams.team2) }}
                  >
                    {matchScore[1]}
                  </p>
                </div>
              </div>

              {/* Final Team Compositions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Combined Team 1 Players */}
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <h5 className="font-semibold text-gray-900 mb-3">
                    {getCombinedTeamName(combinedTeams.team1)} - Players
                  </h5>
                  <div className="space-y-2">
                    {getCombinedTeamPlayers(combinedTeams.team1)
                      .sort((a, b) => b.rating - a.rating)
                      .map((player) => (
                        <div
                          key={player.playerId}
                          className="flex items-center justify-between py-1 px-2 rounded text-sm border-l-2"
                          style={{
                            backgroundColor: `${player.originalTeam.color}15`,
                            borderLeftColor: player.originalTeam.color,
                          }}
                        >
                          <span className="font-medium text-gray-900">
                            {player.playerName}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">
                              #{player.globalRank || "N/A"}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {player.rating}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Combined Team 2 Players */}
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <h5 className="font-semibold text-gray-900 mb-3">
                    {getCombinedTeamName(combinedTeams.team2)} - Players
                  </h5>
                  <div className="space-y-2">
                    {getCombinedTeamPlayers(combinedTeams.team2)
                      .sort((a, b) => b.rating - a.rating)
                      .map((player) => (
                        <div
                          key={player.playerId}
                          className="flex items-center justify-between py-1 px-2 rounded text-sm border-l-2"
                          style={{
                            backgroundColor: `${player.originalTeam.color}15`,
                            borderLeftColor: player.originalTeam.color,
                          }}
                        >
                          <span className="font-medium text-gray-900">
                            {player.playerName}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">
                              #{player.globalRank || "N/A"}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {player.rating}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
