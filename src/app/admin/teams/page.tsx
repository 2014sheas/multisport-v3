"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Save, Trash2 } from "lucide-react";

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

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [createTeamData, setCreateTeamData] = useState({
    name: "",
  });
  const [showCaptainModal, setShowCaptainModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedCaptainId, setSelectedCaptainId] = useState<string>("");
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState<string>("");
  const [editTeamColor, setEditTeamColor] = useState<string>("#3B82F6");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsResponse, playersResponse, usersResponse] = await Promise.all(
        [
          fetch("/api/admin/teams"),
          fetch("/api/admin/players"),
          fetch("/api/admin/users"),
        ]
      );

      const teamsData = await teamsResponse.json();
      const playersData = await playersResponse.json();
      const usersData = await usersResponse.json();

      setTeams(teamsData.teams || []);
      setPlayers(playersData.players || []);
      setUsers(usersData.users || []);
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
      const response = await fetch(`/api/admin/players/${playerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId: teamId,
        }),
      });

      if (response.ok) {
        setMessage("Team assignment updated successfully!");
        setTimeout(() => setMessage(""), 3000);
        fetchData(); // Refresh data
      } else {
        setMessage("Failed to update team assignment");
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
        body: JSON.stringify({ name: createTeamData.name }),
      });

      if (response.ok) {
        setMessage("Team created successfully!");
        setShowCreateTeam(false);
        setCreateTeamData({ name: "" });
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
      // Send name update first
      const nameResponse = await fetch(`/api/admin/teams/${editingTeam.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editTeamName.trim() }),
      });

      // Send color update second
      const colorResponse = await fetch(`/api/admin/teams/${editingTeam.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ color: editTeamColor }),
      });

      if (nameResponse.ok && colorResponse.ok) {
        setMessage("Team updated successfully!");

        // Update the team in the local state instead of refetching all data
        setTeams((prevTeams) =>
          prevTeams.map((team) =>
            team.id === editingTeam.id
              ? { ...team, name: editTeamName.trim(), color: editTeamColor }
              : team
          )
        );

        setShowEditTeamModal(false);
        setEditingTeam(null);
        setEditTeamName("");
        setEditTeamColor("#3B82F6"); // Reset color
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = (await nameResponse.ok)
          ? await colorResponse.json()
          : await nameResponse.json();
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Users className="w-6 h-6 text-blue-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        </div>
        <button
          onClick={() => setShowCreateTeam(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Teams Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Teams</h2>
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-lg shadow-md p-4 border-l-4"
                style={{ borderLeftColor: team.color }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-xs text-gray-500">
                      Captain:{" "}
                      {team.captain
                        ? `${team.captain.name} (Rating: ${team.captain.eloRating})`
                        : "Not assigned"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {getPlayersByTeam(team.id).length} players
                    </span>
                    <button
                      onClick={() => handleEditTeam(team)}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    {getPlayersByTeam(team.id).length > 0 && (
                      <button
                        onClick={() => handleAssignCaptain(team.id)}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
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
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {player.name}
                        </span>
                        <div className="text-xs text-gray-500">
                          Rating: {player.eloRating} | Exp: {player.experience}y
                          | Wins: {player.wins}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAssignToTeam(player.id, null)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unassigned Players Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Unassigned Players
          </h2>
          <div className="bg-white rounded-lg shadow-md p-4">
            {getUnassignedPlayers().length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                All players have been assigned to teams
              </p>
            ) : (
              <div className="space-y-2">
                {getUnassignedPlayers().map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {player.name}
                      </span>
                      <div className="text-xs text-gray-500">
                        Rating: {player.eloRating} | Exp: {player.experience}y |
                        Wins: {player.wins}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        onChange={(e) =>
                          handleAssignToTeam(player.id, e.target.value || null)
                        }
                        disabled={saving}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
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
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New Team
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTeam(false);
                      setCreateTeamData({ name: "" });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a captain...</option>
                  {getPlayersByTeam(selectedTeamId).map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} (Rating: {player.eloRating})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCaptainModal(false);
                    setSelectedTeamId("");
                    setSelectedCaptainId("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitCaptainAssignment}
                  disabled={saving || !selectedCaptainId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTeamModal(false);
                      setEditingTeam(null);
                      setEditTeamName("");
                      setEditTeamColor("#3B82F6"); // Reset color
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
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
