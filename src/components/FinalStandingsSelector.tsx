"use client";

import { useState, useEffect } from "react";
import { Check, X, Trophy, Medal, Award } from "lucide-react";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  logo?: string | null;
}

interface FinalStandingsSelectorProps {
  eventId: string;
  eventType: "TOURNAMENT" | "SCORED" | "COMBINED_TEAM";
  currentFinalStandings: string[] | null;
  points: number[];
  onFinalStandingsSubmit: (finalStandings: string[]) => void;
  onCancel: () => void;
}

export default function FinalStandingsSelector({
  eventId,
  eventType,
  currentFinalStandings,
  points,
  onFinalStandingsSubmit,
  onCancel,
}: FinalStandingsSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStandings, setSelectedStandings] = useState<string[]>(
    currentFinalStandings || []
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams");
      const data = await response.json();
      setTeams(data.teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      setError("Failed to fetch teams");
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = (teamId: string, position: number) => {
    setSelectedStandings((prev) => {
      const newStandings = [...prev];
      newStandings[position] = teamId;
      return newStandings;
    });
  };

  const handleRemoveTeam = (position: number) => {
    setSelectedStandings((prev) => {
      const newStandings = [...prev];
      newStandings.splice(position, 1);
      return newStandings;
    });
  };

  const handleSubmit = () => {
    // Validate that all positions are filled
    const requiredPositions = eventType === "COMBINED_TEAM" ? 4 : points.length;

    if (selectedStandings.length < requiredPositions) {
      setError(`Please select ${requiredPositions} teams for final standings`);
      return;
    }

    // Check for duplicate teams
    const uniqueTeams = new Set(selectedStandings);
    if (uniqueTeams.size !== selectedStandings.length) {
      setError("Each team can only appear once in final standings");
      return;
    }

    setError(null);
    onFinalStandingsSubmit(selectedStandings);
  };

  const getPositionIcon = (position: number) => {
    if (eventType === "COMBINED_TEAM") {
      // Combined team events: first 2 teams get 1st place, last 2 teams get 2nd place
      if (position < 2) {
        return <Trophy className="w-5 h-5 text-yellow-600" />;
      } else {
        return <Medal className="w-5 h-5 text-gray-600" />;
      }
    } else {
      // Regular events: normal position icons
      if (position === 0) {
        return <Trophy className="w-5 h-5 text-yellow-600" />;
      } else if (position === 1) {
        return <Medal className="w-5 h-5 text-gray-600" />;
      } else if (position === 2) {
        return <Award className="w-5 h-5 text-orange-600" />;
      } else {
        return (
          <span className="w-5 h-5 text-gray-400 text-sm font-bold">
            {position + 1}
          </span>
        );
      }
    }
  };

  const getPositionLabel = (position: number) => {
    if (eventType === "COMBINED_TEAM") {
      return position < 2 ? "1st Place" : "2nd Place";
    } else {
      const suffixes = ["st", "nd", "rd", "th"];
      const suffix = position < 3 ? suffixes[position] : suffixes[3];
      return `${position + 1}${suffix} Place`;
    }
  };

  const getPositionColor = (position: number) => {
    if (eventType === "COMBINED_TEAM") {
      return position < 2
        ? "bg-yellow-50 border-yellow-200"
        : "bg-gray-50 border-gray-200";
    } else {
      if (position === 0) return "bg-yellow-50 border-yellow-200";
      if (position === 1) return "bg-gray-50 border-gray-200";
      if (position === 2) return "bg-orange-50 border-orange-200";
      return "bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  const requiredPositions = eventType === "COMBINED_TEAM" ? 4 : points.length;

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Select Final Standings
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {eventType === "COMBINED_TEAM"
            ? "Select 4 teams: first 2 teams will receive 1st place points, last 2 teams will receive 2nd place points"
            : `Select ${requiredPositions} teams in order of finish`}
        </p>
      </div>

      {/* Position Selection */}
      <div className="space-y-4">
        {Array.from({ length: requiredPositions }, (_, index) => (
          <div
            key={index}
            className={`p-4 border-2 border-dashed rounded-lg ${getPositionColor(
              index
            )} ${selectedStandings[index] ? "border-solid" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getPositionIcon(index)}
                <span className="font-medium text-gray-900">
                  {getPositionLabel(index)}
                </span>
                {points[index] && (
                  <span className="text-sm text-gray-600">
                    ({points[index]} pts)
                  </span>
                )}
              </div>
              {selectedStandings[index] && (
                <button
                  onClick={() => handleRemoveTeam(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {selectedStandings[index] ? (
              <div className="flex items-center space-x-3 p-3 bg-white rounded-md border border-gray-200">
                {(() => {
                  const team = teams.find(
                    (t) => t.id === selectedStandings[index]
                  );
                  if (!team) return null;

                  return (
                    <>
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={`${team.name} logo`}
                          className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.abbreviation.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {team.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {team.abbreviation}
                        </div>
                      </div>
                      <Check className="w-5 h-5 text-green-600 ml-auto" />
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleTeamSelect(e.target.value, index);
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a team...</option>
                  {teams
                    .filter((team) => !selectedStandings.includes(team.id))
                    .map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.abbreviation})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={selectedStandings.length < requiredPositions}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Submit Final Standings
        </button>
      </div>
    </div>
  );
}
