import React from "react";
import {
  getBothTeamWinProbabilities,
  calculateTeamAverageRating,
} from "@/lib/elo-utils";

interface Participant {
  team: {
    id: string;
    name: string;
    abbreviation: string;
    color: string;
    seed?: number;
    members?: Array<{
      player: {
        eventRatings: Array<{ rating: number }>;
      };
    }>;
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
  eventId: string;
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

  // If both teams are available, show team abbreviations (more mobile-friendly)
  if (team1 && team2) {
    const vs = `${team1.abbreviation}/${team2.abbreviation}`;
    return `${isWinner ? "Winner" : "Loser"} of ${vs}`;
  }

  // Otherwise fall back to game number (compact format)
  return `${isWinner ? "Winner" : "Loser"} of G${gameNumber}`;
}

// Helper function to calculate team average rating
function getTeamAverageRating(team: Participant["team"]): number {
  if (!team.members || team.members.length === 0) return 5000;

  const ratings = team.members
    .map((member) => {
      const eventRating = member.player.eventRatings[0];
      return eventRating?.rating || 5000;
    })
    .filter((rating) => rating > 0);

  return calculateTeamAverageRating(ratings);
}

// Helper function to get win probability display
function getWinProbabilityDisplay(
  team1: Participant["team"],
  team2: Participant["team"]
) {
  if (!team1 || !team2) return null;

  const team1Rating = getTeamAverageRating(team1);
  const team2Rating = getTeamAverageRating(team2);

  const probabilities = getBothTeamWinProbabilities(team1Rating, team2Rating);

  return {
    team1Rating,
    team2Rating,
    team1WinPercentage: probabilities.team1WinPercentage,
    team2WinPercentage: probabilities.team2WinPercentage,
  };
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

  // Check if this is a hybrid match (some teams known, some not)
  const hasPartialTeams = (team1 && !team2) || (!team1 && team2);
  const isFullyUndetermined = !team1 && !team2;
  const isUndetermined = isFullyUndetermined || hasPartialTeams;

  // Get win probabilities for scheduled matches
  const winProbabilityData =
    team1 && team2 ? getWinProbabilityDisplay(team1, team2) : null;

  // If it's any kind of undetermined game, use the regular card layout
  if (isUndetermined) {
    return (
      <div className="relative p-2 md:p-4 border-2 rounded-xl min-w-[140px] max-w-[140px] md:min-w-[200px] md:max-w-[200px] shadow-sm transition-all duration-200 bg-gray-50 border-gray-300">
        {/* Match Header */}
        <div className="text-center mb-2 md:mb-3">
          <div className="text-xs md:text-sm font-semibold text-gray-700">
            Game {match.matchNumber}
            {match.round === 5 && match.isWinnersBracket && (
              <span className="ml-1 text-orange-600 text-xs">
                (If Necessary)
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {match.status === "COMPLETED"
              ? "Completed"
              : match.status === "IN_PROGRESS"
              ? "In Progress"
              : match.status === "SCHEDULED"
              ? "Scheduled"
              : "Undetermined"}
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-2 md:space-y-3">
          {/* Team 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {team1 ? (
                <span
                  className="text-xs md:text-sm font-medium text-white px-2 py-1 rounded-full truncate"
                  style={{ backgroundColor: team1.color }}
                >
                  {team1.abbreviation}
                </span>
              ) : (
                <div className="text-xs md:text-sm text-gray-500 truncate">
                  {getPlaceholderText(
                    match.team1FromMatch,
                    match.team1IsWinner
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Team 2 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {team2 ? (
                <span
                  className="text-xs md:text-sm font-medium text-white px-2 py-1 rounded-full truncate"
                  style={{ backgroundColor: team2.color }}
                >
                  {team2.abbreviation}
                </span>
              ) : (
                <div className="text-xs md:text-sm text-gray-500 truncate">
                  {getPlaceholderText(
                    match.team2FromMatch,
                    match.team2IsWinner
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isClickable =
    isAdmin && (match.status === "SCHEDULED" || match.status === "IN_PROGRESS");
  const isSelected = selectedMatch === match.id;

  // Determine what action should be available based on current state
  const getActionText = () => {
    if (match.status === "SCHEDULED" && team1 && team2) return "Start Game";
    if (match.status === "IN_PROGRESS") return "Update Score";
    return "";
  };

  const canStartGame = match.status === "SCHEDULED" && team1 && team2;
  const isWaitingForTeams = match.status === "SCHEDULED" && (!team1 || !team2);

  const handleCardClick = () => {
    if (!isAdmin) return;

    if (canStartGame) {
      // Move scheduled game to In Progress state
      onMatchClick(match.id);
    } else if (match.status === "IN_PROGRESS") {
      // Open score update modal
      onMatchClick(match.id);
    }
  };

  return (
    <div
      className={`relative p-2 md:p-4 border-2 rounded-xl min-w-[140px] max-w-[140px] md:min-w-[200px] md:max-w-[200px] shadow-sm transition-all duration-200 ${
        isClickable
          ? "cursor-pointer hover:border-blue-400 hover:shadow-md transform hover:-translate-y-0.5"
          : ""
      } ${isSelected ? "border-blue-500 bg-blue-50 shadow-lg" : ""} ${
        match.status === "COMPLETED"
          ? "bg-green-50 border-green-300"
          : match.status === "IN_PROGRESS"
          ? "bg-yellow-50 border-yellow-300"
          : match.status === "SCHEDULED" && canStartGame
          ? "bg-blue-50 border-blue-300"
          : match.status === "SCHEDULED" && isWaitingForTeams
          ? "bg-gray-50 border-gray-300"
          : isUndetermined
          ? "bg-gray-50 border-gray-300"
          : "bg-white border-gray-300"
      }`}
      onClick={handleCardClick}
    >
      {/* Match Header */}
      <div className="text-center mb-2 md:mb-3">
        <div className="text-xs md:text-sm font-semibold text-gray-700">
          Game {match.matchNumber}
          {match.round === 5 && match.isWinnersBracket && (
            <span className="ml-1 text-orange-600 text-xs">(If Necessary)</span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {match.status === "COMPLETED"
            ? "Completed"
            : match.status === "IN_PROGRESS"
            ? "In Progress"
            : match.status === "SCHEDULED"
            ? "Scheduled"
            : "Undetermined"}
        </div>

        {/* Action indicator for admin users */}
        {isAdmin &&
          (match.status === "SCHEDULED" ||
            match.status === "IN_PROGRESS" ||
            isUndetermined) && (
            <div
              className={`mt-1 text-xs font-medium ${
                canStartGame
                  ? "text-blue-600"
                  : isWaitingForTeams
                  ? "text-gray-500"
                  : isUndetermined
                  ? "text-gray-500"
                  : "text-blue-600"
              }`}
            >
              {getActionText()}
            </div>
          )}
      </div>

      {/* Teams */}
      <div className="space-y-2 md:space-y-3">
        {/* Team 1 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {team1 ? (
              <span
                className="text-xs md:text-sm font-medium text-white px-2 py-1 rounded-full truncate"
                style={{ backgroundColor: team1.color }}
              >
                {team1.abbreviation}
              </span>
            ) : (
              <div className="text-xs md:text-sm text-gray-500 italic truncate">
                {getPlaceholderText(match.team1FromMatch, match.team1IsWinner)}
              </div>
            )}
          </div>
          {match.status === "SCHEDULED" && winProbabilityData ? (
            <div className="flex items-center space-x-1 ml-2">
              <span className="text-xs md:text-sm font-bold text-blue-600">
                {winProbabilityData.team1WinPercentage}%
              </span>
              <span className="text-xs text-blue-500">📊</span>
            </div>
          ) : (
            (match.score || (team1 && team2)) && (
              <span className="text-xs md:text-sm font-bold text-gray-900 ml-2">
                {match.score ? match.score[0] : 0}
              </span>
            )
          )}
        </div>

        {/* Team 2 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {team2 ? (
              <span
                className="text-xs md:text-sm font-medium text-white px-2 py-1 rounded-full truncate"
                style={{ backgroundColor: team2.color }}
              >
                {team2.abbreviation}
              </span>
            ) : (
              <div className="text-xs md:text-sm text-gray-500 italic truncate">
                {getPlaceholderText(match.team2FromMatch, match.team2IsWinner)}
              </div>
            )}
          </div>
          {match.status === "SCHEDULED" && winProbabilityData ? (
            <div className="flex items-center space-x-1 ml-2">
              <span className="text-xs md:text-sm font-bold text-blue-600">
                {winProbabilityData.team2WinPercentage}%
              </span>
              <span className="text-xs text-blue-500">📊</span>
            </div>
          ) : (
            (match.score || (team1 && team2)) && (
              <span className="text-xs md:text-sm font-bold text-gray-900 ml-2">
                {match.score ? match.score[1] : 0}
              </span>
            )
          )}
        </div>
      </div>

      {/* Winner indicator */}
      {winner && (
        <div className="mt-2 md:mt-3 text-center">
          <div className="text-xs md:text-sm font-semibold text-green-700">
            Winner: {winner.abbreviation}
          </div>
        </div>
      )}
    </div>
  );
}
