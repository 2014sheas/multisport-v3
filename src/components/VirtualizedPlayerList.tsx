"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
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
  captainedTeams: Array<{ id: string; name: string }>;
  team: {
    id: string;
    name: string;
    color: string;
    abbreviation?: string;
  } | null;
  eventId?: string;
  eventName?: string;
  eventAbbreviation?: string;
  gamesPlayed?: number;
}

interface VirtualizedPlayerListProps {
  players: Player[];
  itemHeight?: number;
  containerHeight?: number;
}

export default function VirtualizedPlayerList({
  players,
  itemHeight = 80,
  containerHeight = 600,
}: VirtualizedPlayerListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      players.length
    );
    return { startIndex: Math.max(0, startIndex), endIndex };
  }, [scrollTop, itemHeight, containerHeight, players.length]);

  // Get only visible players
  const visiblePlayers = useMemo(() => {
    return players.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [players, visibleRange.startIndex, visibleRange.endIndex]);

  // Calculate total height for scrollbar
  const totalHeight = players.length * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Memoized player row component
  const PlayerRow = useCallback(
    ({ player, index }: { player: Player; index: number }) => {
      const formatExperience = (years: number | undefined) => {
        const experienceYears = years ?? 0;
        if (experienceYears === 0) return "Rookie";
        if (experienceYears === 1) return "1st year";
        if (experienceYears === 2) return "2nd year";
        if (experienceYears === 3) return "3rd year";
        return `${experienceYears}th year`;
      };

      const getTeamColor = (
        team: { name: string; color?: string } | null
      ): string => {
        if (!team) return "#6B7280";
        return team.color || "#3B82F6";
      };

      const getTeamAbbreviation = (
        team: { name: string; abbreviation?: string } | null
      ): string => {
        if (!team) return "FA";
        if (team.abbreviation) return team.abbreviation;

        const words = team.name.split(" ");
        if (words.length === 1) {
          return team.name.substring(0, 3).toUpperCase();
        } else {
          return words
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase();
        }
      };

      const TrendIndicator = ({ trend }: { trend: number }) => {
        if (trend === 0) {
          return (
            <div className="flex items-center text-gray-500">
              <Minus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="text-xs sm:text-sm hidden sm:inline">
                No change
              </span>
              <span className="text-xs sm:hidden">-</span>
            </div>
          );
        } else if (trend > 0) {
          return (
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="text-xs sm:text-sm">+{trend}</span>
            </div>
          );
        } else {
          return (
            <div className="flex items-center text-red-600">
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="text-xs sm:text-sm">{trend}</span>
            </div>
          );
        }
      };

      return (
        <div
          className="py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          style={{
            height: itemHeight,
            borderLeftColor: player.team
              ? getTeamColor(player.team)
              : undefined,
            borderLeftWidth: player.team ? "4px" : "0px",
            backgroundColor: player.team
              ? `${getTeamColor(player.team)}10`
              : undefined,
          }}
        >
          <div className="flex items-center px-6">
            <div className="w-12 sm:w-16 flex-shrink-0">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs font-semibold ${
                  index < 3
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {player.rank}
              </span>
            </div>

            <div className="flex-1 min-w-0 mr-4">
              <div className="flex items-center">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 hidden sm:flex">
                  <span className="text-xs font-bold text-blue-600">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center min-w-0 flex-1">
                  <span className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                    {player.name}
                  </span>
                  {player.captainedTeams.length > 0 && (
                    <Star
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-500 ml-1 flex-shrink-0"
                      fill="currentColor"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="w-20 flex-shrink-0 text-center hidden sm:block">
              <span className="text-xs sm:text-sm text-gray-600">
                {formatExperience(player.experience)}
              </span>
            </div>

            <div className="w-20 flex-shrink-0 text-center">
              {player.team ? (
                <span
                  className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-medium truncate"
                  style={{
                    backgroundColor: `${getTeamColor(player.team)}20`,
                    color: getTeamColor(player.team),
                  }}
                >
                  {getTeamAbbreviation(player.team)}
                </span>
              ) : (
                <span className="text-xs sm:text-sm text-gray-400">FA</span>
              )}
            </div>

            <div className="w-16 flex-shrink-0 text-center">
              <TrendIndicator trend={player.trend} />
            </div>

            <div className="w-16 sm:w-20 flex-shrink-0 text-center">
              <span className="text-xs sm:text-sm font-semibold text-gray-900">
                {player.eloRating}
              </span>
            </div>
          </div>
        </div>
      );
    },
    [itemHeight]
  );

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">
          <div className="w-12 sm:w-16 flex-shrink-0">Rank</div>
          <div className="flex-1 min-w-0">Player</div>
          <div className="w-20 flex-shrink-0 text-center hidden sm:block">
            Experience
          </div>
          <div className="w-20 flex-shrink-0 text-center">Team</div>
          <div className="w-16 flex-shrink-0 text-center">24h Trend</div>
          <div className="w-16 sm:w-20 flex-shrink-0 text-center">Value</div>
        </div>
      </div>

      {/* Virtualized List */}
      <div
        ref={setContainerRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          {visiblePlayers.map((player, index) => (
            <div
              key={player.id}
              style={{
                position: "absolute",
                top: (visibleRange.startIndex + index) * itemHeight,
                left: 0,
                right: 0,
              }}
            >
              <PlayerRow
                player={player}
                index={visibleRange.startIndex + index}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Performance Info */}
      <div className="px-6 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
        Showing {visibleRange.startIndex + 1}-{visibleRange.endIndex} of{" "}
        {players.length} players
        {visiblePlayers.length < players.length &&
          " (virtualized for performance)"}
      </div>
    </div>
  );
}
