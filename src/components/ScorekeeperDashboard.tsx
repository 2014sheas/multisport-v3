"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  Trophy,
  Plus,
  Edit,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Game {
  id: string;
  eventId: string;
  team1Id?: string;
  team2Id?: string;
  team1Score?: number;
  team2Score?: number;
  status:
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "UNDETERMINED";
  scheduledTime?: string;
  location?: string;
  scorekeeperId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    name: string;
    abbreviation: string;
    eventType: string;
    status: string;
  };
  team1?: {
    id: string;
    name: string;
    abbreviation?: string;
    color: string;
  };
  team2?: {
    id: string;
    name: string;
    abbreviation?: string;
    color: string;
  };
  scorekeeper?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Event {
  id: string;
  name: string;
  abbreviation: string;
  eventType: string;
  status: string;
  startTime?: string;
  duration?: number;
  location?: string;
}

interface Team {
  id: string;
  name: string;
  abbreviation?: string;
  color: string;
}

export default function ScorekeeperDashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [createGameData, setCreateGameData] = useState({
    eventId: "",
    team1Id: "",
    team2Id: "",
    scheduledTime: "",
    location: "",
  });
  const [editGameData, setEditGameData] = useState({
    team1Score: 0,
    team2Score: 0,
    status: "SCHEDULED" as Game["status"],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesResponse, eventsResponse, teamsResponse] = await Promise.all([
        fetch("/api/games"),
        fetch("/api/events"),
        fetch("/api/teams"),
      ]);

      const gamesData = await gamesResponse.json();
      const eventsData = await eventsResponse.json();
      const teamsData = await teamsResponse.json();

      setGames(gamesData.games || []);
      setEvents(eventsData.events || []);
      setTeams(teamsData.teams || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createGameData.eventId) {
      alert("Please select an event");
      return;
    }

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createGameData),
      });

      if (response.ok) {
        setShowCreateGame(false);
        setCreateGameData({
          eventId: "",
          team1Id: "",
          team2Id: "",
          scheduledTime: "",
          location: "",
        });
        fetchData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to create game");
      }
    } catch (error) {
      console.error("Error creating game:", error);
      alert("Failed to create game");
    }
  };

  const handleUpdateGame = async (gameId: string) => {
    if (!editingGame) return;

    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editGameData),
      });

      if (response.ok) {
        setEditingGame(null);
        setEditGameData({
          team1Score: 0,
          team2Score: 0,
          status: "SCHEDULED",
        });
        fetchData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update game");
      }
    } catch (error) {
      console.error("Error updating game:", error);
      alert("Failed to update game");
    }
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setEditGameData({
      team1Score: game.team1Score || 0,
      team2Score: game.team2Score || 0,
      status: game.status,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <Clock className="w-4 h-4" />;
      case "IN_PROGRESS":
        return <Users className="w-4 h-4" />;
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4" />;
      case "CANCELLED":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Trophy className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">
            Scorekeeper Dashboard
          </h1>
        </div>
        <p className="text-lg text-gray-600">
          Manage games, update scores, and complete matches for events.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Games</p>
              <p className="text-2xl font-bold text-gray-900">{games.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">
                {games.filter((g) => g.status === "SCHEDULED").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {games.filter((g) => g.status === "IN_PROGRESS").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {games.filter((g) => g.status === "COMPLETED").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-8">
        <button
          onClick={() => setShowCreateGame(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Game
        </button>
      </div>

      {/* Games List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Games</h2>
        </div>

        {games.length === 0 ? (
          <div className="p-8 text-center">
            <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              No games created yet
            </h3>
            <p className="text-gray-500 text-sm">
              Create your first game to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {games.map((game) => (
              <div key={game.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-2 rounded-full ${getStatusColor(
                        game.status
                      )}`}
                    >
                      {getStatusIcon(game.status)}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {game.event.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {game.event.abbreviation} • {game.event.eventType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditGame(game)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team 1 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {game.team1 ? game.team1.name : "TBD"}
                    </h4>
                    {game.team1 && (
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: game.team1.color }}
                        />
                        <span className="text-sm text-gray-600">
                          {game.team1.abbreviation || game.team1.name}
                        </span>
                      </div>
                    )}
                    {game.team1Score !== undefined && (
                      <div className="text-2xl font-bold text-gray-900 mt-2">
                        {game.team1Score}
                      </div>
                    )}
                  </div>

                  {/* Team 2 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {game.team2 ? game.team2.name : "TBD"}
                    </h4>
                    {game.team2 && (
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: game.team2.color }}
                        />
                        <span className="text-sm text-gray-600">
                          {game.team2.abbreviation || game.team2.name}
                        </span>
                      </div>
                    )}
                    {game.team2Score !== undefined && (
                      <div className="text-2xl font-bold text-gray-900 mt-2">
                        {game.team2Score}
                      </div>
                    )}
                  </div>
                </div>

                {/* Game Details */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        game.status
                      )}`}
                    >
                      {game.status}
                    </span>
                  </div>
                  {game.scheduledTime && (
                    <div>
                      <span className="font-medium">Scheduled:</span>{" "}
                      {new Date(game.scheduledTime).toLocaleString()}
                    </div>
                  )}
                  {game.location && (
                    <div>
                      <span className="font-medium">Location:</span>{" "}
                      {game.location}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Game Modal */}
      {showCreateGame && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New Game
              </h3>
              <form onSubmit={handleCreateGame}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event
                  </label>
                  <select
                    value={createGameData.eventId}
                    onChange={(e) =>
                      setCreateGameData({
                        ...createGameData,
                        eventId: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an event...</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name} ({event.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team 1
                  </label>
                  <select
                    value={createGameData.team1Id}
                    onChange={(e) =>
                      setCreateGameData({
                        ...createGameData,
                        team1Id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select team 1...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.abbreviation || team.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team 2
                  </label>
                  <select
                    value={createGameData.team2Id}
                    onChange={(e) =>
                      setCreateGameData({
                        ...createGameData,
                        team2Id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select team 2...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.abbreviation || team.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Time
                  </label>
                  <input
                    type="datetime-local"
                    value={createGameData.scheduledTime}
                    onChange={(e) =>
                      setCreateGameData({
                        ...createGameData,
                        scheduledTime: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={createGameData.location}
                    onChange={(e) =>
                      setCreateGameData({
                        ...createGameData,
                        location: e.target.value,
                      })
                    }
                    placeholder="Optional location"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateGame(false);
                      setCreateGameData({
                        eventId: "",
                        team1Id: "",
                        team2Id: "",
                        scheduledTime: "",
                        location: "",
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
                    Create Game
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Game Modal */}
      {editingGame && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update Game
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateGame(editingGame.id);
                }}
              >
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team 1 Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editGameData.team1Score}
                    onChange={(e) =>
                      setEditGameData({
                        ...editGameData,
                        team1Score: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team 2 Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editGameData.team2Score}
                    onChange={(e) =>
                      setEditGameData({
                        ...editGameData,
                        team2Score: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={editGameData.status}
                    onChange={(e) =>
                      setEditGameData({
                        ...editGameData,
                        status: e.target.value as Game["status"],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGame(null);
                      setEditGameData({
                        team1Score: 0,
                        team2Score: 0,
                        status: "SCHEDULED",
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
                    Update Game
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
