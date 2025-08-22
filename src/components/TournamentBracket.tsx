"use client";

import { useState, useMemo } from "react";
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

interface Participant {
  id: string;
  teamId: string;
  seed?: number;
  isEliminated: boolean;
  eliminationRound?: number;
  finalPosition?: number;
  team: Team;
}

interface TournamentBracketProps {
  eventId: string;
  teams: Team[];
  matches: Match[];
  participants?: Participant[];
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
  participants = [],
  isAdmin = false,
  eventStatus,
  onMatchUpdate,
}: TournamentBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<[number, number]>([0, 0]);

  // Removed unused functions: getTeamById, getTeamByParticipantId

  const getOrdinalSuffix = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return "st";
    if (n % 10 === 2 && n % 100 !== 12) return "nd";
    if (n % 10 === 3 && n % 100 !== 13) return "rd";
    return "th";
  };

  const getMatchById = (matchId: string) => {
    return matches.find((match) => match.id === matchId);
  };

  const getWinnersBracketMatches = () => {
    const filteredMatches = matches
      .filter((match) => {
        // Always include non-"If Necessary" games
        if (match.round !== 5 || !match.isWinnersBracket) {
          return true;
        }

        // For the "If Necessary" game (round 5, winners bracket), only include if it should be played
        return shouldShowIfNecessaryGame();
      })
      .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);

    return filteredMatches;
  };

  const getMaxRounds = () => {
    const winnersMatches = getWinnersBracketMatches();
    return Math.max(...winnersMatches.map((match) => match.round));
  };

  // Check if the "If Necessary" game should be played
  const shouldShowIfNecessaryGame = () => {
    // Find the championship game (Game 6)
    const championshipMatch = matches.find(
      (match) =>
        match.round === 4 && match.isWinnersBracket && match.matchNumber === 6
    );

    if (!championshipMatch || championshipMatch.status !== "COMPLETED") {
      return false;
    }

    // Find the championship winner
    const championshipWinnerId = championshipMatch.winnerId;

    if (!championshipWinnerId) {
      return false;
    }

    // Check if the championship winner came from losers bracket
    // by looking at their match history
    const winnerMatchHistory = matches.filter(
      (match) =>
        (match.team1Id === championshipWinnerId ||
          match.team2Id === championshipWinnerId) &&
        match.status === "COMPLETED"
    );

    // If they played in any losers bracket match, they came from losers bracket
    const winnerCameFromLosersBracket = winnerMatchHistory.some(
      (match) => !match.isWinnersBracket
    );

    // Game 7 is necessary only if the championship winner came from losers bracket
    // This means the losers bracket champion won, forcing a rematch
    return winnerCameFromLosersBracket;
  };

  const getMatchesByRound = useMemo(() => {
    return (round: number, isWinners: boolean) => {
      return matches
        .filter(
          (match) =>
            match.round === round && match.isWinnersBracket === isWinners
        )
        .sort((a, b) => {
          // Primary sort: by matchNumber
          if (a.matchNumber !== b.matchNumber) {
            return a.matchNumber - b.matchNumber;
          }
          // Secondary sort: by ID to ensure consistent ordering even if matchNumbers are the same
          return a.id.localeCompare(b.id);
        });
    };
  }, [matches]);

  const areAllMatchesCompleted = () => {
    return matches.every((match) => {
      // Skip Game 7 (If Necessary) if it shouldn't be played
      if (
        match.round === 5 &&
        match.isWinnersBracket &&
        match.matchNumber === 7
      ) {
        const shouldShow = shouldShowIfNecessaryGame();
        if (!shouldShow) {
          return true; // Consider it "completed" if it doesn't need to be played
        }
      }
      return match.status === "COMPLETED";
    });
  };

  const handleMatchClick = (matchId: string) => {
    if (!isAdmin) return;

    const match = getMatchById(matchId);
    if (!match) return;

    if (match.status === "SCHEDULED" && match.team1Id && match.team2Id) {
      // Move scheduled game to In Progress state
      // Only if both teams are assigned
      if (onMatchUpdate) {
        onMatchUpdate(matchId, null, [0, 0], false);
      }
    } else if (match.status === "IN_PROGRESS") {
      // Open score update modal for in-progress games
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

  const calculateFinalStandings = () => {
    // Get final standings based on bracket results
    // This should return an array of team IDs ordered by their final position
    const standings: string[] = [];

    // Find the championship match (Game 6)
    const championshipMatch = matches.find(
      (match) =>
        match.round === 4 && match.isWinnersBracket && match.matchNumber === 6
    );

    if (!championshipMatch || championshipMatch.status !== "COMPLETED") {
      return [];
    }

    // Find the "If Necessary" match (Game 7)
    const ifNecessaryMatch = matches.find(
      (match) =>
        match.round === 5 && match.isWinnersBracket && match.matchNumber === 7
    );

    // Determine 1st and 2nd place
    if (ifNecessaryMatch?.status === "COMPLETED") {
      // Game 7 was played - this means the losers bracket champion won the championship
      // The winner of Game 7 is the overall champion
      const game7Winner = participants.find(
        (p) => p.id === ifNecessaryMatch.winnerId
      );

      // Find the loser of Game 7
      let game7Loser: Participant | undefined;
      if (
        ifNecessaryMatch.team1Id &&
        ifNecessaryMatch.team2Id &&
        ifNecessaryMatch.winnerId
      ) {
        if (ifNecessaryMatch.winnerId === ifNecessaryMatch.team1Id) {
          game7Loser = participants.find(
            (p) => p.id === ifNecessaryMatch.team2Id
          );
        } else {
          game7Loser = participants.find(
            (p) => p.id === ifNecessaryMatch.team1Id
          );
        }
      }

      if (game7Winner) standings.push(game7Winner.teamId); // 1st place
      if (game7Loser) standings.push(game7Loser.teamId); // 2nd place
    } else {
      // No Game 7 - winners bracket champion won
      const championshipWinner = participants.find(
        (p) => p.id === championshipMatch.winnerId
      );

      // Find the loser of the championship
      let championshipLoser: Participant | undefined;
      if (
        championshipMatch.team1Id &&
        championshipMatch.team2Id &&
        championshipMatch.winnerId
      ) {
        if (championshipMatch.winnerId === championshipMatch.team1Id) {
          championshipLoser = participants.find(
            (p) => p.id === championshipMatch.team2Id
          );
        } else {
          championshipLoser = participants.find(
            (p) => p.id === championshipMatch.team1Id
          );
        }
      }

      if (championshipWinner) standings.push(championshipWinner.teamId); // 1st place
      if (championshipLoser) standings.push(championshipLoser.teamId); // 2nd place
    }

    // For 3rd and 4th place, find the teams that lost in the losers bracket final
    // This is the match where the losers bracket champion is determined
    const losersBracketFinal = matches.find(
      (match) =>
        match.round === 3 &&
        !match.isWinnersBracket &&
        match.status === "COMPLETED"
    );

    if (losersBracketFinal) {
      // Find the loser of the losers bracket final
      let losersBracketLoser: Participant | undefined;
      if (
        losersBracketFinal.team1Id &&
        losersBracketFinal.team2Id &&
        losersBracketFinal.winnerId
      ) {
        if (losersBracketFinal.winnerId === losersBracketFinal.team1Id) {
          losersBracketLoser = participants.find(
            (p) => p.id === losersBracketFinal.team2Id
          );
        } else {
          losersBracketLoser = participants.find(
            (p) => p.id === losersBracketFinal.team1Id
          );
        }
      }

      // The loser of the losers bracket final is 3rd place
      if (
        losersBracketLoser &&
        !standings.includes(losersBracketLoser.teamId)
      ) {
        standings.push(losersBracketLoser.teamId);
      }

      // The winner of the losers bracket final is either 1st or 2nd (already added above)
      // The remaining team is 4th place
      const remainingTeam = participants.find(
        (p) => !standings.includes(p.teamId)
      );
      if (remainingTeam) {
        standings.push(remainingTeam.teamId);
      }
    }

    // Ensure we have exactly 4 teams
    if (standings.length !== 4) {
      console.error(`Expected 4 teams in standings, got ${standings.length}`);
    }

    return standings;
  };

  const handleCompleteTournament = async () => {
    try {
      // Calculate final standings - these are already team IDs
      const finalStandings = calculateFinalStandings();

      // Store team IDs directly - much simpler!
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          finalStandings: finalStandings, // Store team IDs directly
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
    const isWinnersBracket = isWinners;
    const bracketMatches = matches.filter(
      (match) => match.isWinnersBracket === isWinnersBracket
    );
    const maxRounds = Math.max(
      ...bracketMatches.map((match) => match.round),
      0
    );

    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            {isWinners ? "Winners Bracket" : "Losers Bracket"}
          </h2>

          {/* Complete Tournament Button - Show only for winners bracket when in progress */}
          {isWinners && eventStatus === "IN_PROGRESS" && isAdmin && (
            <button
              onClick={handleCompleteTournament}
              disabled={!areAllMatchesCompleted()}
              className={`inline-flex items-center px-2 md:px-3 py-1 md:py-2 border border-transparent shadow-sm text-xs md:text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                areAllMatchesCompleted()
                  ? "text-white bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  : "text-gray-400 bg-gray-300 cursor-not-allowed"
              }`}
            >
              <Trophy className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Complete Tournament</span>
              <span className="sm:hidden">Complete</span>
            </button>
          )}
        </div>

        <div className="flex space-x-4 md:space-x-8 lg:space-x-12 overflow-x-auto pb-4 min-h-[300px] md:min-h-[400px]">
          {Array.from({ length: maxRounds }, (_, roundIndex) => {
            const round = roundIndex + 1;
            let roundMatches = getMatchesByRound(round, isWinners);

            // Filter out Game 7 (If Necessary) if it shouldn't be shown
            if (isWinners && round === 5) {
              roundMatches = roundMatches.filter((match) => {
                if (match.matchNumber === 7) {
                  return shouldShowIfNecessaryGame();
                }
                return true;
              });
            }

            if (roundMatches.length === 0) return null;

            // Calculate vertical spacing for bracket effect
            const getVerticalSpacing = (round: number) => {
              // More compact spacing for mobile, larger for desktop
              // Ensure minimum spacing to prevent overlapping
              const baseSpacing = 16; // Increased to 16 for better separation
              const roundMultiplier = Math.pow(2, round - 1);
              return baseSpacing * roundMultiplier;
            };

            const verticalSpacing = getVerticalSpacing(round);

            return (
              <div
                key={round}
                className="flex flex-col justify-center min-w-[160px] md:min-w-[200px] lg:min-w-[220px]"
              >
                {/* Round Header */}
                <div className="text-center font-semibold text-gray-800 mb-3 md:mb-6 sticky top-0 bg-white py-1 md:py-2 border-b border-gray-200">
                  <span className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm font-medium shadow-sm">
                    Round {round}
                  </span>
                </div>

                {/* Matches with bracket spacing */}
                <div className="flex flex-col items-center justify-center flex-1">
                  {roundMatches.map((match, matchIndex) => (
                    <div
                      key={`${round}-${match.matchNumber}`}
                      className="flex items-center justify-center"
                      style={{
                        marginTop:
                          matchIndex === 0 ? "0" : `${verticalSpacing}px`,
                        marginBottom:
                          matchIndex === roundMatches.length - 1
                            ? "0"
                            : `${Math.max(verticalSpacing / 2, 12)}px`, // Ensure minimum 12px spacing
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
    <div className="space-y-4 md:space-y-6">
      {/* Final Standings - Show only when event is completed */}
      {eventStatus === "COMPLETED" && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-600 mr-2" />
            <h2 className="text-xl md:text-2xl font-bold text-yellow-800">
              Final Tournament Results
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {(() => {
              // For now, use calculated standings but note this should match database
              const finalStandings = calculateFinalStandings();
              const medals = ["🥇", "🥈", "🥉", "4️⃣"];
              const places = [
                "1st Place",
                "2nd Place",
                "3rd Place",
                "4th Place",
              ];

              return finalStandings.map((teamId, index) => {
                const team = teams.find((t) => t.id === teamId);
                if (!team) return null;

                return (
                  <div
                    key={teamId}
                    className={`
                      flex items-center justify-between p-3 md:p-4 rounded-lg border-2 
                      ${
                        index === 0
                          ? "bg-yellow-100 border-yellow-300"
                          : index === 1
                          ? "bg-gray-100 border-gray-300"
                          : index === 2
                          ? "bg-orange-100 border-orange-300"
                          : "bg-blue-50 border-blue-200"
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <span className="text-2xl md:text-3xl">
                        {medals[index]}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm md:text-base">
                          {places[index]}
                        </div>
                        <div
                          className="text-xs md:text-sm font-medium text-white px-2 py-1 rounded-full"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.abbreviation}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 text-xs md:text-sm">
                        {team.name}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
      {/* Winners Bracket */}
      {renderBracket(true)}

      {/* Losers Bracket */}
      {renderBracket(false)}

      {/* Score Input Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 md:top-20 mx-auto p-3 md:p-5 border w-80 md:w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-base md:text-lg font-medium text-black mb-3 md:mb-4">
                Update Match Score
              </h3>

              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-black mb-1 md:mb-2">
                    {(() => {
                      const match = getMatchById(selectedMatch);
                      const team1 = match?.team1?.team;
                      return team1 ? `${team1.name} Score` : "Team 1 Score";
                    })()}
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
                    className="w-full px-2 md:px-3 py-1 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm md:text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-black mb-1 md:mb-2">
                    {(() => {
                      const match = getMatchById(selectedMatch);
                      const team2 = match?.team2?.team;
                      return team2 ? `${team2.name} Score` : "Team 2 Score";
                    })()}
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
                    className="w-full px-2 md:px-3 py-1 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm md:text-base"
                  />
                </div>
              </div>

              <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
                {/* Primary Actions Row */}
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={handleScoreUpdate}
                    className="px-3 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm md:text-base"
                  >
                    Update Score
                  </button>
                  <button
                    onClick={handleMatchComplete}
                    className="px-3 md:px-4 py-1 md:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-sm md:text-base"
                  >
                    Complete Match
                  </button>
                </div>

                {/* Secondary Actions Row */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="px-3 md:px-4 py-1 md:py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors text-sm md:text-base"
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
