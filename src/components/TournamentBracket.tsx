"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import GameCard from "./GameCard";

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
  team1Id: string | null;
  team2Id: string | null;
  round: number;
  matchNumber: number;
  isWinnersBracket: boolean;
  winnerId?: string;
  score?: [number, number];
  status:
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "UNDETERMINED";
  scheduledTime?: string;
  location?: string;
  team1?: Participant;
  team2?: Participant;

  // Placeholder references
  team1FromMatchId?: string | null;
  team1IsWinner?: boolean | null;
  team2FromMatchId?: string | null;
  team2IsWinner?: boolean | null;

  // Relations to referenced matches
  team1FromMatch?: {
    matchNumber: number;
    team1?: Participant;
    team2?: Participant;
  } | null;
  team2FromMatch?: {
    matchNumber: number;
    team1?: Participant;
    team2?: Participant;
  } | null;
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

  const renderBracket = (isWinners: boolean) => {
    const maxRounds = getMaxRounds();
    const title = isWinners ? "Winners Bracket" : "Losers Bracket";

    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
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

        <div className="flex space-x-12 overflow-x-auto pb-4 min-h-[400px]">
          {Array.from({ length: maxRounds }, (_, roundIndex) => {
            const round = roundIndex + 1;
            const roundMatches = getMatchesByRound(round, isWinners);

            if (roundMatches.length === 0) return null;

            // Calculate vertical spacing for bracket effect
            const getVerticalSpacing = (
              round: number,
              totalMatches: number
            ) => {
              // More spacing for later rounds to create bracket funnel effect
              const baseSpacing = 16; // Base spacing in rem
              const roundMultiplier = Math.pow(2, round - 1);
              return baseSpacing * roundMultiplier;
            };

            const verticalSpacing = getVerticalSpacing(
              round,
              roundMatches.length
            );

            return (
              <div
                key={round}
                className="flex flex-col justify-center min-w-[220px]"
              >
                {/* Round Header */}
                <div className="text-center font-semibold text-gray-800 mb-6 sticky top-0 bg-white py-2 border-b border-gray-200">
                  <span className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                    Round {round}
                  </span>
                </div>

                {/* Matches with bracket spacing */}
                <div className="flex flex-col items-center justify-center flex-1">
                  {roundMatches.map((match, matchIndex) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-center"
                      style={{
                        marginTop:
                          matchIndex === 0 ? "0" : `${verticalSpacing}px`,
                        marginBottom:
                          matchIndex === roundMatches.length - 1
                            ? "0"
                            : `${verticalSpacing / 2}px`,
                      }}
                    >
                      <GameCard
                        match={match}
                        isAdmin={isAdmin}
                        onMatchClick={handleMatchClick}
                        selectedMatch={selectedMatch}
                      />
                    </div>
                  ))}
                </div>
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
