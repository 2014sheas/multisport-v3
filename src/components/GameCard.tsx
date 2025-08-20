import React, { useState } from "react";

interface Participant {
  team: {
    id: string;
    name: string;
    abbreviation: string;
    color: string;
    seed?: number;
  };
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

  // Relations to referenced matches (for getting match numbers and teams)
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

interface GameCardProps {
  match: Match;
  isAdmin: boolean;
  onMatchClick: (matchId: string) => void;
  selectedMatch: string | null;
}

// Helper function to generate placeholder text based on referenced match
function getPlaceholderText(
  referencedMatch:
    | {
        matchNumber: number;
        team1?: Participant;
        team2?: Participant;
      }
    | null
    | undefined,
  isWinner: boolean | null | undefined
): string {
  if (!referencedMatch) {
    return "Game ?";
  }

  const gameNumber = referencedMatch.matchNumber;
  const team1 = referencedMatch.team1?.team;
  const team2 = referencedMatch.team2?.team;

  // If both teams are available, show team abbreviations
  if (team1 && team2) {
    const vs = `${team1.abbreviation}/${team2.abbreviation}`;
    return `${isWinner ? "Winner" : "Loser"} of ${vs}`;
  }

  // Otherwise fall back to game number
  return `${isWinner ? "Winner" : "Loser"} of Game ${gameNumber}`;
}

export default function GameCard({
  match,
  isAdmin,
  onMatchClick,
  selectedMatch,
}: GameCardProps) {
  // Use participant data directly if available, otherwise fall back to team lookup
  const team1 = match.team1?.team || (match.team1Id ? null : null);
  const team2 = match.team2?.team || (match.team2Id ? null : null);
  const winner = match.winnerId ? match.team1?.team || match.team2?.team : null;

  // Skip matches that don't have teams assigned yet (advancement matches)
  if (!team1 || !team2) {
    return (
      <div className="relative p-4 border-2 rounded-xl min-w-[200px] max-w-[200px] bg-gray-50 border-gray-300 shadow-sm">
        {/* Match header */}
        <div className="text-xs text-gray-500 mb-2 text-center">
          Game {match.matchNumber}
          {match.round === 5 && match.isWinnersBracket && (
            <span className="ml-2 text-orange-600 font-semibold">
              (If Necessary)
            </span>
          )}
        </div>

        {/* Placeholder content */}
        <div className="text-center text-gray-500 py-4">
          <div className="text-xs space-y-1">
            {match.team1FromMatchId && (
              <div>
                Team 1:{" "}
                {getPlaceholderText(match.team1FromMatch, match.team1IsWinner)}
              </div>
            )}
            {match.team2FromMatchId && (
              <div>
                Team 2:{" "}
                {getPlaceholderText(match.team2FromMatch, match.team2IsWinner)}
              </div>
            )}
            {!match.team1FromMatchId && !match.team2FromMatchId && (
              <div>Teams TBD</div>
            )}
          </div>
        </div>

        {/* Match status */}
        <div className="mt-2 text-xs text-center">
          <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-800">
            {match.status.replace("_", " ")}
          </span>
        </div>
      </div>
    );
  }

  const isClickable =
    isAdmin && (match.status === "SCHEDULED" || match.status === "IN_PROGRESS");
  const isSelected = selectedMatch === match.id;

  return (
    <div
      className={`relative p-4 border-2 rounded-xl min-w-[200px] max-w-[200px] shadow-sm transition-all duration-200 ${
        isClickable
          ? "cursor-pointer hover:border-blue-400 hover:shadow-md transform hover:-translate-y-0.5"
          : ""
      } ${isSelected ? "border-blue-500 bg-blue-50 shadow-lg" : ""} ${
        match.status === "COMPLETED"
          ? "bg-green-50 border-green-300 shadow-sm"
          : match.status === "IN_PROGRESS"
          ? "bg-yellow-50 border-yellow-300 shadow-sm"
          : "bg-white border-gray-300"
      }`}
      onClick={() => onMatchClick(match.id)}
    >
      {/* Match header */}
      <div className="text-xs text-gray-500 mb-2">
        Game {match.matchNumber}
        {match.round === 5 && match.isWinnersBracket && (
          <span className="ml-2 text-orange-600 font-semibold">
            (If Necessary)
          </span>
        )}
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
}
