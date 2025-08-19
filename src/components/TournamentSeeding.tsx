"use client";

import { useState, useEffect } from "react";
import { Shuffle, Check, Users, Trophy } from "lucide-react";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  eloRating: number;
}

interface TournamentSeedingProps {
  eventId: string;
  teams: Team[];
  onSeedsConfirmed: (seeds: { teamId: string; seed: number }[]) => void;
  isAdmin?: boolean;
  eventStatus: "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
  confirmedSeeds?: { teamId: string; seed: number }[];
  eventData?: {
    name: string;
    abbreviation: string;
    symbol: string;
    eventType: string;
    startTime: string;
    duration?: number;
    location: string;
    points: number[];
  };
}

export default function TournamentSeeding({
  eventId,
  teams,
  onSeedsConfirmed,
  isAdmin = false,
  eventStatus,
  confirmedSeeds = [],
  eventData,
}: TournamentSeedingProps) {
  const [seeds, setSeeds] = useState<{ teamId: string; seed: number }[]>([]);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    // Initialize seeds based on ELO rating (highest first)
    const sortedTeams = [...teams].sort((a, b) => b.eloRating - a.eloRating);
    const initialSeeds = sortedTeams.map((team, index) => ({
      teamId: team.id,
      seed: index + 1,
    }));
    setSeeds(initialSeeds);
  }, [teams]);

  // Check if we have confirmed seeds from parent component
  useEffect(() => {
    if (confirmedSeeds && confirmedSeeds.length > 0) {
      setIsConfirmed(true);
    }
  }, [confirmedSeeds]);

  const randomizeSeeds = () => {
    setIsRandomizing(true);

    // Simulate randomization delay
    setTimeout(() => {
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      const newSeeds = shuffledTeams.map((team, index) => ({
        teamId: team.id,
        seed: index + 1,
      }));
      setSeeds(newSeeds);
      setIsRandomizing(false);
    }, 1000);
  };

  const confirmSeeds = async () => {
    // Persist locally for UI state
    setIsConfirmed(true);
    onSeedsConfirmed(seeds);

    // Immediately generate bracket and move event to IN_PROGRESS
    try {
      const genRes = await fetch("/api/tournament/generate-bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId, seeds }),
      });

      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}));
        console.error("Failed to generate bracket on confirm:", err);
        return;
      }

      // Update event status to IN_PROGRESS
      if (!eventData) {
        console.error("No event data available for status update");
        return;
      }

      const updateRes = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: eventData.name,
          abbreviation: eventData.abbreviation,
          symbol: eventData.symbol,
          eventType: eventData.eventType,
          status: "IN_PROGRESS",
          startTime: eventData.startTime,
          duration: eventData.duration,
          location: eventData.location,
          points: eventData.points,
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        console.error("Failed to update event status to IN_PROGRESS:", err);
      }
    } catch (e) {
      console.error("Error confirming seeds -> start tournament:", e);
    } finally {
      // Reload page data via navigation so parent picks up new bracket and status
      try {
        // Best-effort: call a light endpoint to refresh client state; fallback to hard reload
        window.location.reload();
      } catch {}
    }
  };

  const handleSelectTeamForSeed = (seedIndex: number, newTeamId: string) => {
    setSeeds((prev) => {
      const next = [...prev];
      const currentTeamId = next[seedIndex]?.teamId;
      if (currentTeamId === newTeamId) return next;

      // If the selected team is already assigned to a different seed, swap them
      const existingIndex = next.findIndex((s) => s.teamId === newTeamId);
      if (existingIndex !== -1) {
        const tmp = next[existingIndex].teamId;
        next[existingIndex].teamId = currentTeamId;
        next[seedIndex].teamId = tmp;
      } else {
        // Otherwise just assign directly
        next[seedIndex].teamId = newTeamId;
      }
      // Ensure seed numbers remain consistent with position (1-based)
      return next.map((s, idx) => ({ teamId: s.teamId, seed: idx + 1 }));
    });
  };

  const moveSeed = (index: number, direction: -1 | 1) => {
    setSeeds((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next.map((s, idx) => ({ teamId: s.teamId, seed: idx + 1 }));
    });
  };

  const resetToElo = () => {
    const sortedTeams = [...teams].sort((a, b) => b.eloRating - a.eloRating);
    const initialSeeds = sortedTeams.map((team, index) => ({
      teamId: team.id,
      seed: index + 1,
    }));
    setSeeds(initialSeeds);
  };

  const getTeamById = (teamId: string) => {
    return teams.find((team) => team.id === teamId);
  };

  // Show different UI based on event status
  if (eventStatus === "COMPLETED") {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Trophy className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Tournament Completed
          </h3>
        </div>
        <p className="text-gray-600 mb-4">
          This tournament has been completed. View the final bracket for
          results.
        </p>
        <div className="space-y-2">
          {seeds.map((seed) => {
            const team = getTeamById(seed.teamId);
            if (!team) return null;

            return (
              <div
                key={seed.teamId}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-sm font-semibold text-green-700">
                  {seed.seed}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{team.name}</div>
                  <div className="text-sm text-gray-500">
                    ELO: {Math.round(team.eloRating)}
                  </div>
                </div>
                <div
                  className="w-4 h-4 rounded-full border-2"
                  style={{ backgroundColor: team.color }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (eventStatus === "IN_PROGRESS") {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Trophy className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Tournament In Progress
          </h3>
        </div>
        <p className="text-gray-600 mb-4">
          Tournament bracket has been generated and is currently in progress.
          Manage matches and update scores below.
        </p>
        <div className="space-y-2">
          {seeds.map((seed) => {
            const team = getTeamById(seed.teamId);
            if (!team) return null;

            return (
              <div
                key={seed.teamId}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {seed.seed}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{team.name}</div>
                  <div className="text-sm text-gray-500">
                    ELO: {Math.round(team.eloRating)}
                  </div>
                </div>
                <div
                  className="w-4 h-4 rounded-full border-2"
                  style={{ backgroundColor: team.color }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Tournament Seeding
          </h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={randomizeSeeds}
            disabled={isRandomizing || isConfirmed}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            {isRandomizing ? "Randomizing..." : "Randomize Seeds"}
          </button>
          <button
            onClick={() => setManualMode((m) => !m)}
            disabled={isConfirmed}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {manualMode ? "Exit Manual Mode" : "Manual Mode"}
          </button>
          {manualMode && (
            <button
              onClick={resetToElo}
              disabled={isConfirmed}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reset to ELO
            </button>
          )}
          {!isConfirmed && (
            <button
              onClick={confirmSeeds}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Seeds
            </button>
          )}
          {/* Start button removed: confirming seeds now starts tournament */}
        </div>
      </div>

      {manualMode && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
          Manual mode enabled: choose a team for each seed or use the arrows to
          reorder. Confirm when ready.
        </div>
      )}

      {isConfirmed && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Seeds confirmed! Tournament bracket can now be generated.
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {seeds.map((seed, index) => {
          const team = getTeamById(seed.teamId);
          if (!team) return null;

          return (
            <div
              key={`${seed.seed}-${seed.teamId}`}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-sm font-semibold text-blue-700 border-2 border-blue-300">
                {seed.seed}
              </div>
              <div className="flex-1">
                {manualMode && !isConfirmed ? (
                  <select
                    className="w-full border-gray-300 rounded-md text-gray-900"
                    value={seed.teamId}
                    onChange={(e) =>
                      handleSelectTeamForSeed(index, e.target.value)
                    }
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (ELO {Math.round(t.eloRating)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <div className="font-medium text-gray-900">{team.name}</div>
                    <div className="text-sm text-gray-500">
                      ELO: {Math.round(team.eloRating)}
                    </div>
                  </>
                )}
              </div>
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{ backgroundColor: team.color }}
              />
              {manualMode && !isConfirmed && (
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => moveSeed(index, -1)}
                    className="px-2 py-1 text-xs border rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSeed(index, 1)}
                    className="px-2 py-1 text-xs border rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start space-x-2">
          <Trophy className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">
              Tournament Seeding
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              Seeds determine the initial bracket placement. Higher seeds (lower
              numbers) typically face lower seeds in early rounds. Randomize to
              create unpredictable matchups, or keep the ELO-based seeding for a
              more competitive structure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
