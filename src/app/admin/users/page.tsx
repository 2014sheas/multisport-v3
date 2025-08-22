"use client";

import { useState, useEffect } from "react";
import { Search, Link, Unlink, Users } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isScorekeeper: boolean;
  player?: {
    id: string;
    name: string;
    eloRating: number;
  };
}

interface Player {
  id: string;
  name: string;
  eloRating: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [usersResponse, playersResponse] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/players"),
      ]);
      const usersData = await usersResponse.json();
      const playersData = await playersResponse.json();

      setUsers(usersData.users);
      setPlayers(playersData.players);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLinkPlayer = async (userId: string, playerId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: playerId,
        }),
      });

      if (response.ok) {
        setShowLinkModal(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        console.error("Failed to link player:", response.status);
      }
    } catch (error) {
      console.error("Error linking player:", error);
    }
  };

  const handleUnlinkPlayer = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: null,
        }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error unlinking player:", error);
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
    <AdminGuard>
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Users Table - Desktop */}
        <div className="hidden lg:block bg-white shadow-md rounded-lg overflow-hidden">
          {loading && (
            <div className="p-4 text-center bg-blue-50 border-b border-blue-200">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 inline-block mr-2"></div>
              <span className="text-sm text-blue-600">Loading users...</span>
            </div>
          )}
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? "No users found" : "No users"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first user."}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player Profile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.player ? (
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{user.player.name}</div>
                          <div className="text-gray-500">
                            Rating: {user.player.eloRating}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          No player linked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 mr-2">
                          Status:
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isAdmin
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.isAdmin ? "Admin" : "User"}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isScorekeeper
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.isScorekeeper
                            ? "Scorekeeper"
                            : "Not Scorekeeper"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user.player ? (
                        <button
                          onClick={() => handleUnlinkPlayer(user.id)}
                          className="text-red-600 hover:text-red-900 mr-3"
                          title="Unlink player"
                        >
                          <Unlink className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowLinkModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Link player"
                        >
                          <Link className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Users Cards - Mobile */}
        <div className="lg:hidden space-y-4">
          {loading && (
            <div className="p-4 text-center bg-blue-50 border border-blue-200 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 inline-block mr-2"></div>
              <span className="text-sm text-blue-600">Loading users...</span>
            </div>
          )}
          {filteredUsers.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? "No users found" : "No users"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first user."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white shadow-md rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {user.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{user.email}</p>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 mr-2">
                            Status:
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isAdmin
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {user.isAdmin ? "Admin" : "User"}
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isScorekeeper
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {user.isScorekeeper
                              ? "Scorekeeper"
                              : "Not Scorekeeper"}
                          </span>
                        </div>

                        {user.player ? (
                          <div className="p-3 bg-gray-50 rounded-md">
                            <div className="text-sm">
                              <span className="text-gray-500">
                                Linked to player:
                              </span>
                              <div className="font-medium text-gray-900 mt-1">
                                {user.player.name}
                              </div>
                              <div className="text-gray-500 text-xs">
                                Rating: {user.player.eloRating}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            No player profile linked
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex-shrink-0">
                      {user.player ? (
                        <button
                          onClick={() => handleUnlinkPlayer(user.id)}
                          className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50"
                          title="Unlink player"
                        >
                          <Unlink className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowLinkModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50"
                          title="Link player"
                        >
                          <Link className="w-5 h-5" />
                        </button>
                      )}

                      {/* Role Management Buttons */}
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `/api/admin/users/${user.id}`,
                                {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    isAdmin: !user.isAdmin,
                                  }),
                                }
                              );
                              if (response.ok) {
                                fetchUsers();
                              }
                            } catch (error) {
                              console.error(
                                "Error updating admin status:",
                                error
                              );
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            user.isAdmin
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          title={user.isAdmin ? "Remove admin" : "Make admin"}
                        >
                          {user.isAdmin ? "Remove Admin" : "Make Admin"}
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `/api/admin/users/${user.id}`,
                                {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    isScorekeeper: !user.isScorekeeper,
                                  }),
                                }
                              );
                              if (response.ok) {
                                fetchUsers();
                              }
                            } catch (error) {
                              console.error(
                                "Error updating scorekeeper status:",
                                error
                              );
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            user.isScorekeeper
                              ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          title={
                            user.isScorekeeper
                              ? "Remove scorekeeper"
                              : "Make scorekeeper"
                          }
                        >
                          {user.isScorekeeper
                            ? "Remove Scorekeeper"
                            : "Make Scorekeeper"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Link Player Modal */}
        {showLinkModal && editingUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Link Player to User
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Link a player profile to {editingUser.name} (
                  {editingUser.email})
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Player
                  </label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a player...</option>
                    {players
                      .filter(
                        (player) =>
                          !users.some((u) => u.player?.id === player.id)
                      )
                      .map((player) => (
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
                      setShowLinkModal(false);
                      setEditingUser(null);
                      setSelectedPlayerId("");
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      handleLinkPlayer(editingUser.id, selectedPlayerId)
                    }
                    disabled={!selectedPlayerId}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Link Player
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
