"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Edit } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";

interface Player {
  id: string;
  name: string;
  eloRating: number;
  experience: number;
  wins: number;
  isActive: boolean;
  gamesPlayed: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  teamId?: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editFormData, setEditFormData] = useState({
    name: "",
    eloRating: 5000,
    experience: 0,
    wins: 0,
  });
  const [formData, setFormData] = useState({
    name: "",
    eloRating: 5000,
    experience: 0,
    wins: 0,
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        fetchPlayers(1, searchTerm, sortBy, sortOrder);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, sortBy, sortOrder]);

  const fetchPlayers = async (
    page = 1,
    search = "",
    sortByParam = "name",
    sortOrderParam: "asc" | "desc" = "asc"
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search,
        sortBy: sortByParam,
        sortOrder: sortOrderParam,
      });

      const response = await fetch(`/api/admin/players?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPlayers(data.players || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error("Error fetching players:", error);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddForm(false);
        setFormData({ name: "", eloRating: 5000, experience: 0, wins: 0 });
        fetchPlayers();
      }
    } catch (error) {
      console.error("Error adding player:", error);
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    try {
      const response = await fetch(`/api/admin/players/${editingPlayer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        setEditingPlayer(null);
        setEditFormData({ name: "", eloRating: 5000, experience: 0, wins: 0 });
        fetchPlayers();
      }
    } catch (error) {
      console.error("Error updating player:", error);
    }
  };

  const handleEditClick = (player: Player) => {
    setEditingPlayer(player);
    setEditFormData({
      name: player.name,
      eloRating: player.eloRating,
      experience: player.experience,
      wins: player.wins,
    });
  };

  if (loading && players.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Player Management
          </h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-3 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 flex items-center justify-center w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Player
          </button>
        </div>

        {/* Search and Sort Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search players by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name">Name</option>
                <option value="eloRating">Rating</option>
                <option value="experience">Experience</option>
                <option value="wins">Wins</option>
                <option value="gamesPlayed">Games</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newOrder = sortOrder === "asc" ? "desc" : "asc";
                    setSortOrder(newOrder);
                    fetchPlayers(1, searchTerm, sortBy, newOrder);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>

                {/* Search Button */}
                <button
                  onClick={() => fetchPlayers(1, searchTerm, sortBy, sortOrder)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex-1 sm:flex-none"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Players Table - Desktop */}
        <div className="hidden lg:block bg-white shadow-md rounded-lg overflow-hidden">
          {loading && players.length > 0 && (
            <div className="p-4 text-center bg-blue-50 border-b border-blue-200">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 inline-block mr-2"></div>
              <span className="text-sm text-blue-600">Updating players...</span>
            </div>
          )}
          {players.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No players
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first player.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Elo Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wins
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Linked Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {player.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {player.eloRating}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {player.experience} years
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{player.wins}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {player.user ? (
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{player.user.name}</div>
                          <div className="text-gray-500">
                            {player.user.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          No account linked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(player)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Players Cards - Mobile */}
        <div className="lg:hidden space-y-4">
          {loading && players.length > 0 && (
            <div className="p-4 text-center bg-blue-50 border border-blue-200 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 inline-block mr-2"></div>
              <span className="text-sm text-blue-600">Updating players...</span>
            </div>
          )}
          {players.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No players
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first player.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="bg-white shadow-md rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {player.name}
                      </h3>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Rating:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {player.eloRating}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Experience:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {player.experience} years
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Wins:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {player.wins}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Games:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {player.gamesPlayed}
                          </span>
                        </div>
                      </div>
                      {player.user && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <div className="text-sm">
                            <span className="text-gray-500">Linked to:</span>
                            <div className="font-medium text-gray-900 mt-1">
                              {player.user.name}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {player.user.email}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleEditClick(player)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} results
            </div>
            <div className="flex items-center justify-center sm:justify-end space-x-2">
              <button
                onClick={() =>
                  fetchPlayers(
                    pagination.page - 1,
                    searchTerm,
                    sortBy,
                    sortOrder
                  )
                }
                disabled={pagination.page <= 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 px-3 py-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  fetchPlayers(
                    pagination.page + 1,
                    searchTerm,
                    sortBy,
                    sortOrder
                  )
                }
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Add Player Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add New Player
                </h3>
                <form onSubmit={handleAddPlayer}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Starting Elo Rating
                    </label>
                    <input
                      type="number"
                      value={formData.eloRating}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eloRating: parseInt(e.target.value) || 5000,
                        })
                      }
                      min="0"
                      max="9999"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience (years)
                    </label>
                    <input
                      type="number"
                      value={formData.experience}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          experience: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Starting Wins
                    </label>
                    <input
                      type="number"
                      value={formData.wins}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wins: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setFormData({
                          name: "",
                          eloRating: 5000,
                          experience: 0,
                          wins: 0,
                        });
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Add Player
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Player Form */}
        {editingPlayer && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Edit Player
                </h3>
                <form onSubmit={handleUpdatePlayer}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          name: e.target.value,
                        })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Elo Rating
                    </label>
                    <input
                      type="number"
                      value={editFormData.eloRating}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          eloRating: parseInt(e.target.value) || 5000,
                        })
                      }
                      min="0"
                      max="9999"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience (years)
                    </label>
                    <input
                      type="number"
                      value={editFormData.experience}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          experience: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wins
                    </label>
                    <input
                      type="number"
                      value={editFormData.wins}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          wins: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlayer(null);
                        setEditFormData({
                          name: "",
                          eloRating: 5000,
                          experience: 0,
                          wins: 0,
                        });
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Update Player
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
