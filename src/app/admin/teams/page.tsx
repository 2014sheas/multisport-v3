"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Calendar } from "lucide-react";

interface Player {
  id: string;
  name: string;
  eloRating: number;
  experience: number;
  wins: number;
  teamId?: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
  abbreviation?: string;
  year: number;
  captain?: {
    id: string;
    name: string;
    eloRating: number;
    experience: number;
    wins: number;
  };
  members: Player[];
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Year {
  id: string;
  year: number;
  isActive: boolean;
  description?: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [createTeamData, setCreateTeamData] = useState({
    name: "",
    year: new Date().getFullYear(),
  });
  const [showCaptainModal, setShowCaptainModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedCaptainId, setSelectedCaptainId] = useState<string>("");
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState<string>("");
  const [editTeamColor, setEditTeamColor] = useState<string>("#3B82F6");
  const [editTeamAbbreviation, setEditTeamAbbreviation] = useState<string>("");
  const [editTeamYear, setEditTeamYear] = useState<number>(
    new Date().getFullYear()
  );

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      const [teamsResponse, playersResponse, usersResponse, yearsResponse] =
        await Promise.all([
          fetch(`/api/admin/teams?year=${selectedYear}`),
          fetch("/api/admin/players"),
          fetch("/api/admin/users"),
          fetch("/api/admin/years"),
        ]);

      const teamsData = await teamsResponse.json();
      const playersData = await playersResponse.json();
      const usersData = await usersResponse.json();
      const yearsData = await yearsResponse.json();

      setTeams(teamsData.data?.teams || []);
      setPlayers(playersData.players || []);
      setUsers(usersData.users || []);
      setYears(yearsData.years || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToTeam = async (
    playerId: string,
    teamId: string | null
  ) => {
    setSaving(true);
    setMessage("");

    try {
      if (teamId) {
        // Assign player to team for the selected year
        const response = await fetch("/api/admin/team-members", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teamId,
            playerId,
            year: selectedYear,
          }),
        });

        if (response.ok) {
          setMessage("Player assigned to team successfully!");
          setTimeout(() => setMessage(""), 3000);
          fetchData(); // Refresh data
        } else {
          const errorData = await response.json();
          setMessage(errorData.error || "Failed to assign player to team");
        }
      } else {
        // Remove player from team for the selected year
        const response = await fetch(
          `/api/admin/team-members?teamId=${playerId}&playerId=${playerId}&year=${selectedYear}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          setMessage("Player removed from team successfully!");
          setTimeout(() => setMessage(""), 3000);
          fetchData(); // Refresh data
        } else {
          setMessage("Failed to remove player from team");
        }
      }
    } catch (error) {
      console.error("Error updating team assignment:", error);
      setMessage("Failed to update team assignment");
    } finally {
      setSaving(false);
    }
  };

  const getPlayersByTeam = (teamId: string) => {
    return players.filter((player) => player.teamId === teamId);
  };

  const getUnassignedPlayers = () => {
    return players.filter((player) => !player.teamId);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTeamData.name) {
      setMessage("Team name is required");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createTeamData.name,
          year: createTeamData.year,
        }),
      });

      if (response.ok) {
        setMessage("Team created successfully!");
        setShowCreateTeam(false);
        setCreateTeamData({ name: "", year: new Date().getFullYear() });
        setTimeout(() => setMessage(""), 3000);
        fetchData();
      } else {
        setMessage("Failed to create team");
      }
    } catch (error) {
      console.error("Error creating team:", error);
      setMessage("Failed to create team");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignCaptain = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedCaptainId("");
    setShowCaptainModal(true);
  };

  const handleSubmitCaptainAssignment = async () => {
    if (!selectedCaptainId) {
      setMessage("Please select a captain");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/teams/${selectedTeamId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ captainId: selectedCaptainId }),
      });

      if (response.ok) {
        setMessage("Captain assigned successfully!");
        setShowCaptainModal(false);
        setTimeout(() => setMessage(""), 3000);
        fetchData();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || "Failed to assign captain");
      }
    } catch (error) {
      console.error("Error assigning captain:", error);
      setMessage("Failed to assign captain");
    } finally {
      setSaving(false);
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamColor(team.color);
    setEditTeamAbbreviation(team.abbreviation || "");
    setEditTeamYear(team.year);
    setShowEditTeamModal(true);
  };

  const handleSubmitTeamEdit = async () => {
    if (!editingTeam || !editTeamName.trim()) {
      setMessage("Team name is required");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // Send all updates together
      const response = await fetch(`/api/admin/teams/${editingTeam.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editTeamName.trim(),
          color: editTeamColor,
          abbreviation: editTeamAbbreviation.trim() || null,
          year: editTeamYear,
        }),
      });

      if (response.ok) {
        setMessage("Team updated successfully!");
        setShowEditTeamModal(false);
        setEditingTeam(null);
        setEditTeamName("");
        setEditTeamColor("#3B82F6");
        setEditTeamAbbreviation("");
        setEditTeamYear(new Date().getFullYear());
        setTimeout(() => setMessage(""), 3000);
        fetchData();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || "Failed to update team");
      }
    } catch (error) {
      console.error("Error updating team:", error);
      setMessage("Failed to update team");
    } finally {
      setSaving(false);
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
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Users className="w-6 h-6 text-blue-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        </div>
        <div className="flex items-center space-x-4">
          {/* Year Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {years.map((year) => (
                <option key={year.id} value={year.year}>
                  {year.year} {year.isActive ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowCreateTeam(true)}
            className="bg-blue-600 text-white px-4 py-3 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 flex items-center justify-center w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md ${
            message.includes("successfully")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Year Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-blue-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Managing Teams for {selectedYear}
            </h3>
            <p className="text-sm text-blue-700">
              {years.find((y) => y.year === selectedYear)?.description ||
                "View and manage teams for this year"}
            </p>
          </div>
        </div>
      </div>

      {players.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Users className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No players available
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You need to create players before you can manage teams. Go to
                  the Players admin page to create your first player.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Teams Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Teams for {selectedYear}
          </h2>
          <div className="space-y-4">
            {teams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  No teams created for {selectedYear}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  Create your first team for this year to get started with team
                  management.
                </p>
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </button>
              </div>
            ) : (
              <>
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-white rounded-lg shadow-md p-4 border-l-4"
                    style={{ borderLeftColor: team.color }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {team.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Year: {team.year} | Captain:{" "}
                          {team.captain ? (
                            <span className="flex items-center space-x-2">
                              <span>{team.captain.name}</span>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  team.captain.eloRating >= 6500
                                    ? "bg-green-100 text-green-800"
                                    : team.captain.eloRating >= 5500
                                    ? "bg-blue-100 text-blue-800"
                                    : team.captain.eloRating >= 4500
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                Rating: {team.captain.eloRating}
                              </span>
                            </span>
                          ) : (
                            "Not assigned"
                          )}
                        </p>
                        {team.abbreviation && (
                          <p className="text-xs text-gray-500">
                            Abbreviation: {team.abbreviation}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Team Rating:{" "}
                          {getPlayersByTeam(team.id).length > 0
                            ? Math.round(
                                getPlayersByTeam(team.id).reduce(
                                  (sum, p) => sum + p.eloRating,
                                  0
                                ) / getPlayersByTeam(team.id).length
                              )
                            : "N/A"}{" "}
                          | {getPlayersByTeam(team.id).length} players
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleEditTeam(team)}
                          className="text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200"
                        >
                          Edit
                        </button>
                        {getPlayersByTeam(team.id).length > 0 && (
                          <button
                            onClick={() => handleAssignCaptain(team.id)}
                            className="text-xs bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200"
                          >
                            Assign Captain
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {getPlayersByTeam(team.id).map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 block truncate">
                              {player.name}
                            </span>
                            <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  player.eloRating >= 6500
                                    ? "bg-green-100 text-green-800"
                                    : player.eloRating >= 5500
                                    ? "bg-blue-100 text-blue-800"
                                    : player.eloRating >= 4500
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                Rating: {player.eloRating}
                              </span>
                              <span>Exp: {player.experience}y</span>
                              <span>Wins: {player.wins}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-2">
                            <button
                              onClick={() =>
                                handleAssignToTeam(player.id, null)
                              }
                              disabled={saving}
                              className="text-red-600 hover:text-red-800 text-xs p-2 rounded hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Unassigned Players Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Unassigned Players for {selectedYear}
          </h2>
          {players.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                No players created yet
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                You need to create players before you can assign them to teams.
              </p>
              <p className="text-xs text-gray-400">
                Go to the Players admin page to create your first player.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-4">
              {getUnassignedPlayers().length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    All players assigned
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {players.length === 0
                      ? "No players have been created yet. Create players first, then create teams to assign them to."
                      : "All players have been successfully assigned to teams for this year."}
                  </p>
                  {players.length === 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-400 mb-2">
                        You can create players from the Players admin page.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {getUnassignedPlayers().map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 block truncate">
                          {player.name}
                        </span>
                        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              player.eloRating >= 6500
                                ? "bg-green-100 text-green-800"
                                : player.eloRating >= 5500
                                ? "bg-blue-100 text-blue-800"
                                : player.eloRating >= 4500
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            Rating: {player.eloRating}
                          </span>
                          <span>Exp: {player.experience}y</span>
                          <span>Wins: {player.wins}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <select
                          onChange={(e) =>
                            handleAssignToTeam(
                              player.id,
                              e.target.value || null
                            )
                          }
                          disabled={saving}
                          className="text-xs border border-gray-300 rounded px-2 py-2 min-w-[120px]"
                        >
                          <option value="">Assign to team...</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New Team for {selectedYear}
              </h3>
              <form onSubmit={handleCreateTeam}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={createTeamData.name}
                    onChange={(e) =>
                      setCreateTeamData({
                        ...createTeamData,
                        name: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    value={createTeamData.year}
                    onChange={(e) =>
                      setCreateTeamData({
                        ...createTeamData,
                        year: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {years.map((year) => (
                      <option key={year.id} value={year.year}>
                        {year.year} {year.isActive ? "(Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTeam(false);
                      setCreateTeamData({
                        name: "",
                        year: new Date().getFullYear(),
                      });
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Create Team"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Captain Assignment Modal */}
      {showCaptainModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assign Team Captain
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Select a player from the team to be the captain
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Captain
                </label>
                <select
                  value={selectedCaptainId}
                  onChange={(e) => setSelectedCaptainId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a captain...</option>
                  {getPlayersByTeam(selectedTeamId).map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} (Rating: {player.eloRating})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCaptainModal(false);
                    setSelectedTeamId("");
                    setSelectedCaptainId("");
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitCaptainAssignment}
                  disabled={saving || !selectedCaptainId}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Assigning..." : "Assign Captain"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditTeamModal && editingTeam && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Team
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitTeamEdit();
                }}
              >
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={editTeamColor}
                      onChange={(e) => setEditTeamColor(e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: editTeamColor }}
                    ></div>
                    <span className="text-sm text-gray-600">
                      {editTeamColor}
                    </span>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Abbreviation
                  </label>
                  <input
                    type="text"
                    value={editTeamAbbreviation}
                    onChange={(e) => setEditTeamAbbreviation(e.target.value)}
                    placeholder="e.g., ALP, TB, GAM"
                    maxLength={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Short abbreviation for the team (max 5 characters). Leave
                    empty to auto-generate.
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    value={editTeamYear}
                    onChange={(e) => setEditTeamYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {years.map((year) => (
                      <option key={year.id} value={year.year}>
                        {year.year} {year.isActive ? "(Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTeamModal(false);
                      setEditingTeam(null);
                      setEditTeamName("");
                      setEditTeamColor("#3B82F6");
                      setEditTeamAbbreviation("");
                      setEditTeamYear(new Date().getFullYear());
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Updating..." : "Update Team"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
