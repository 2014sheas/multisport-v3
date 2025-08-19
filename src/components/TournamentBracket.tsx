"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  seed?: number;
}

interface Participant {
  id: string;
  teamId: string;
  team: Team;
  seed?: number;
}

interface Match {
  id: string;
  team1Id: string; // This is now a participant ID
  team2Id: string; // This is now a participant ID
  round: number;
  matchNumber: number;
  isWinnersBracket: boolean;
  winnerId?: string;
  score?: [number, number];
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  scheduledTime?: string;
  location?: string;
  team1?: Participant; // Include the actual participant data
  team2?: Participant; // Include the actual participant data
}

interface TournamentBracketProps {
  eventId: string;
  teams: Team[];
  matches: Match[];
  isAdmin?: boolean;
  eventStatus: "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
  onMatchUpdate?: (
    matchId: string,
    winnerId: string | null,
    score: [number, number],
    completed?: boolean
  ) => void;
}

export default function TournamentBracket({
  eventId,
  teams,
  matches,
  isAdmin = false,
  eventStatus,
  onMatchUpdate,
}: TournamentBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<[number, number]>([0, 0]);

  const getTeamById = (teamId: string) => {
    return teams.find((team) => team.id === teamId);
  };

  const getTeamByParticipantId = (participantId: string, matches: Match[]) => {
    // Find the match that contains this participant
    const match = matches.find(
      (m) => m.team1Id === participantId || m.team2Id === participantId
    );
    if (!match) return null;

    // Get the participant data from the match
    const participant =
      match.team1Id === participantId ? match.team1 : match.team2;
    if (!participant) return null;

    // Return the team data
    return participant.team;
  };

  const getMatchById = (matchId: string) => {
    return matches.find((match) => match.id === matchId);
  };

  const getWinnersBracketMatches = () => {
    return matches
      .filter((match) => match.isWinnersBracket)
      .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);
  };

  const getMaxRounds = () => {
    const winnersMatches = getWinnersBracketMatches();
    return Math.max(...winnersMatches.map((match) => match.round));
  };

  const getMatchesByRound = (round: number, isWinners: boolean) => {
    return matches.filter(
      (match) => match.round === round && match.isWinnersBracket === isWinners
    );
  };

  const areAllMatchesCompleted = () => {
    return matches.every((match) => match.status === "COMPLETED");
  };

  const handleMatchClick = (matchId: string) => {
    if (!isAdmin) return;

    const match = getMatchById(matchId);
    if (
      match &&
      (match.status === "SCHEDULED" || match.status === "IN_PROGRESS")
    ) {
      setSelectedMatch(matchId);
      // Initialize with existing score if available, otherwise [0, 0]
      setMatchScore(match.score || [0, 0]);
    }
  };

  const handleScoreUpdate = () => {
    if (!selectedMatch || !onMatchUpdate) return;

    const match = getMatchById(selectedMatch);
    if (!match) return;

    // Update score without completing the match (no winner)
    onMatchUpdate(selectedMatch, null, matchScore, false);
    setSelectedMatch(null);
  };

  const handleMatchComplete = () => {
    if (!selectedMatch || !onMatchUpdate) return;

    const match = getMatchById(selectedMatch);
    if (!match) return;

    // Complete the match with a winner
    const winnerId =
      matchScore[0] > matchScore[1] ? match.team1Id : match.team2Id;

    onMatchUpdate(selectedMatch, winnerId, matchScore, true);
    setSelectedMatch(null);
  };

  const handleCompleteTournament = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
        }),
      });

      if (response.ok) {
        // Refresh the page or update state
        window.location.reload();
      }
    } catch (error) {
      console.error("Error completing tournament:", error);
    }
  };

  const renderMatch = (match: Match) => {
    // Use participant data directly if available, otherwise fall back to team lookup
    const team1 = match.team1?.team || getTeamById(match.team1Id);
    const team2 = match.team2?.team || getTeamById(match.team2Id);
    const winner = match.winnerId ? getTeamById(match.winnerId) : null;

    // Skip matches with placeholder teams (like ADVANCE_, LOSER_, etc.)
    if (
      !team1 ||
      !team2 ||
      match.team1Id.startsWith("ADVANCE_") ||
      match.team1Id.startsWith("LOSER_") ||
      match.team2Id.startsWith("ADVANCE_") ||
      match.team2Id.startsWith("LOSER_")
    ) {
      return null;
    }

    const isClickable =
      isAdmin &&
      (match.status === "SCHEDULED" || match.status === "IN_PROGRESS");
    const isSelected = selectedMatch === match.id;

    return (
      <div
        key={match.id}
        className={`relative p-3 border rounded-lg min-w-[200px] ${
          isClickable ? "cursor-pointer hover:border-blue-300" : ""
        } ${isSelected ? "border-blue-500 bg-blue-50" : ""} ${
          match.status === "COMPLETED"
            ? "bg-green-50 border-green-200"
            : match.status === "IN_PROGRESS"
            ? "bg-yellow-50 border-yellow-200"
            : "bg-white border-gray-200"
        }`}
        onClick={() => handleMatchClick(match.id)}
      >
        {/* Match header */}
        <div className="text-xs text-gray-500 mb-2">
          {match.isWinnersBracket ? "Winners" : "Losers"} Bracket - Round{" "}
          {match.round}
        </div>

        {/* Team 1 */}
        <div
          className={`flex items-center space-x-2 p-2 rounded ${
            winner?.id === team1.id ? "bg-green-100" : ""
          }`}
        >
          <span
            className="text-sm font-medium px-2 py-1 rounded-full text-white font-bold"
            style={{
              backgroundColor: team1.color,
            }}
          >
            {team1.name}
          </span>
          {team1.seed && (
            <span className="text-xs bg-gray-200 px-1 rounded text-black">
              #{team1.seed}
            </span>
          )}
          {match.score && (
            <span className="ml-auto font-semibold text-black">
              {match.score[0]}
            </span>
          )}
        </div>

        {/* Team 2 */}
        <div
          className={`flex items-center space-x-2 p-2 rounded ${
            winner?.id === team2.id ? "bg-green-100" : ""
          }`}
        >
          <span
            className="text-sm font-medium px-2 py-1 rounded-full text-white font-bold"
            style={{
              backgroundColor: team2.color,
            }}
          >
            {team2.name}
          </span>
          {team2.seed && (
            <span className="text-xs bg-gray-200 px-1 rounded text-black">
              #{team2.seed}
            </span>
          )}
          {match.score && (
            <span className="ml-auto font-semibold text-black">
              {match.score[1]}
            </span>
          )}
        </div>

        {/* Match status */}
        <div className="mt-2 text-xs text-center">
          <span
            className={`inline-flex px-2 py-1 rounded-full ${
              match.status === "COMPLETED"
                ? "bg-green-100 text-green-800"
                : match.status === "IN_PROGRESS"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {match.status.replace("_", " ")}
          </span>
        </div>

        {/* Match details */}
        {match.scheduledTime && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            {new Date(match.scheduledTime).toLocaleTimeString()}
          </div>
        )}
        {match.location && (
          <div className="mt-1 text-xs text-gray-500 text-center">
            📍 {match.location}
          </div>
        )}
      </div>
    );
  };

  const renderBracket = (isWinners: boolean) => {
    const maxRounds = getMaxRounds();
    const title = isWinners ? "Winners Bracket" : "Losers Bracket";

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>

          {/* Complete Tournament Button - Show only for winners bracket when in progress */}
          {isWinners && eventStatus === "IN_PROGRESS" && isAdmin && (
            <button
              onClick={handleCompleteTournament}
              disabled={!areAllMatchesCompleted()}
              className={`inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                areAllMatchesCompleted()
                  ? "text-white bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  : "text-gray-400 bg-gray-300 cursor-not-allowed"
              }`}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Complete Tournament
            </button>
          )}
        </div>

        <div className="flex space-x-8 overflow-x-auto pb-4">
          {Array.from({ length: maxRounds }, (_, roundIndex) => {
            const round = roundIndex + 1;
            const roundMatches = getMatchesByRound(round, isWinners);

            if (roundMatches.length === 0) return null;

            return (
              <div key={round} className="flex flex-col space-y-4">
                <div className="text-center font-medium text-gray-700 mb-2">
                  Round {round}
                </div>
                {roundMatches.map((match) => renderMatch(match))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Winners Bracket */}
      {renderBracket(true)}

      {/* Losers Bracket */}
      {renderBracket(false)}

      {/* Score Input Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-black mb-4">
                Update Match Score
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Team 1 Score
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Team 2 Score
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Primary Actions Row */}
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={handleScoreUpdate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Update Score
                  </button>
                  <button
                    onClick={handleMatchComplete}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    Complete Match
                  </button>
                </div>

                {/* Secondary Actions Row */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
