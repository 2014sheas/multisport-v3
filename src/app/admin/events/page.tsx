"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Edit, Trash2 } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";

interface Event {
  id: string;
  name: string;
  abbreviation: string;
  symbol: string;
  eventType: "TOURNAMENT" | "SCORED";
  status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
  startTime: string;
  location: string;
  points: number[];
  finalStandings: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// Preset point options for 4-team events
const POINT_PRESETS = [
  { name: "Standard (10, 7, 4, 2)", value: [10, 7, 4, 2] },
  { name: "Low Points (5, 3, 2, 1)", value: [5, 3, 2, 1] },
  { name: "High Points (15, 10, 6, 3)", value: [15, 10, 6, 3] },
  { name: "Equal Top (10, 10, 4, 4)", value: [10, 10, 4, 4] },
  { name: "Winner Takes All (20, 0, 0, 0)", value: [20, 0, 0, 0] },
  { name: "Balanced (8, 6, 4, 2)", value: [8, 6, 4, 2] },
  { name: "Tournament Style (12, 8, 5, 3)", value: [12, 8, 5, 3] },
  { name: "Scored Style (6, 4, 3, 1)", value: [6, 4, 3, 1] },
];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    abbreviation: "",
    symbol: "",
    eventType: "TOURNAMENT" as "TOURNAMENT" | "SCORED",
    status: "UPCOMING" as "UPCOMING" | "IN_PROGRESS" | "COMPLETED",
    startTime: "",
    location: "",
    points: [10, 7, 4, 2] as number[],
    finalStandings: [] as string[],
  });
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    symbol: "",
    eventType: "TOURNAMENT" as "TOURNAMENT" | "SCORED",
    status: "UPCOMING" as "UPCOMING" | "IN_PROGRESS" | "COMPLETED",
    startTime: "",
    location: "",
    points: [10, 7, 4, 2] as number[],
    finalStandings: [] as string[],
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  // Update time remaining every minute for upcoming events
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update time remaining
      setEvents((prevEvents) => [...prevEvents]);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/admin/events");
      const data = await response.json();
      // Sort events by start time (earliest first)
      const sortedEvents = data.events.sort(
        (a: Event, b: Event) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      setEvents(sortedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddForm(false);
        setFormData({
          name: "",
          abbreviation: "",
          symbol: "",
          eventType: "TOURNAMENT",
          status: "UPCOMING",
          startTime: "",
          location: "",
          points: [10, 7, 4, 2],
          finalStandings: [],
        });
        fetchEvents();
      }
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      const response = await fetch(`/api/admin/events/${editingEvent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        setEditingEvent(null);
        setEditFormData({
          name: "",
          abbreviation: "",
          symbol: "",
          eventType: "TOURNAMENT",
          status: "UPCOMING",
          startTime: "",
          location: "",
          points: [10, 7, 4, 2],
          finalStandings: [],
        });
        fetchEvents();
      }
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleEditClick = (event: Event) => {
    setEditingEvent(event);
    setEditFormData({
      name: event.name,
      abbreviation: event.abbreviation,
      symbol: event.symbol,
      eventType: event.eventType,
      status: event.status,
      startTime: new Date(event.startTime).toISOString().slice(0, 16),
      location: event.location,
      points: event.points,
      finalStandings: event.finalStandings || [],
    });
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchEvents();
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const getOrdinalSuffix = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) {
      return "st";
    }
    if (n % 10 === 2 && n % 100 !== 12) {
      return "nd";
    }
    if (n % 10 === 3 && n % 100 !== 13) {
      return "rd";
    }
    return "th";
  };

  const getTimeRemaining = (startTime: string) => {
    const now = new Date().getTime();
    const eventTime = new Date(startTime).getTime();
    const distance = eventTime - now;

    if (distance < 0) {
      return null; // Event has passed
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ${hours} hour${
        hours > 1 ? "s" : ""
      }`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${
        minutes > 1 ? "s" : ""
      }`;
    } else {
      return `${minutes} minute${minutes > 1 ? "s" : ""}`;
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </button>
        </div>

        {/* Events Schedule */}
        <div className="space-y-6">
          {/* Events Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className={`bg-white shadow-lg rounded-lg overflow-hidden border transition-all duration-300 hover:shadow-xl ${
                  event.status === "UPCOMING"
                    ? "border-yellow-200 hover:border-yellow-300"
                    : event.status === "IN_PROGRESS"
                    ? "border-blue-200 hover:border-blue-300"
                    : "border-green-200 hover:border-green-300"
                }`}
              >
                {/* Event Header */}
                <div
                  className={`p-6 ${
                    event.status === "UPCOMING"
                      ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200"
                      : event.status === "IN_PROGRESS"
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200"
                      : "bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{event.symbol}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {event.name}
                        </h3>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.eventType === "TOURNAMENT"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {event.eventType}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.status === "UPCOMING"
                            ? "bg-yellow-100 text-yellow-800"
                            : event.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {event.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-6 space-y-4">
                  {/* Date and Time */}
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(event.startTime).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.startTime).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                      {event.status === "UPCOMING" && (
                        <p className="text-sm text-blue-600 font-medium">
                          {getTimeRemaining(event.startTime)} remaining
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 text-gray-400">
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">{event.location}</p>
                  </div>

                  {/* Points Structure */}
                  {event.points && event.points.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        Points Structure:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {event.points.map((point, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {index + 1}
                            {getOrdinalSuffix(index + 1)}: {point} pts
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Final Standings */}
                  {event.status === "COMPLETED" &&
                    event.finalStandings &&
                    event.finalStandings.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          Final Standings:
                        </p>
                        <div className="space-y-1">
                          {event.finalStandings.map((teamId, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2"
                            >
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                  index === 0
                                    ? "bg-yellow-200 text-yellow-800"
                                    : index === 1
                                    ? "bg-gray-200 text-gray-800"
                                    : index === 2
                                    ? "bg-orange-200 text-orange-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <span className="text-sm text-gray-700">
                                Team {teamId}
                              </span>
                              {event.points && event.points[index] && (
                                <span className="text-xs text-gray-500 ml-auto">
                                  {event.points[index]} pts
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleEditClick(event)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {events.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <Calendar className="h-12 w-12" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No events scheduled
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new event.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Event Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add New Event
                </h3>
                <form onSubmit={handleAddEvent}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Abbreviation
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.abbreviation}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            abbreviation: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Symbol (Emoji)
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.symbol}
                        onChange={(e) =>
                          setFormData({ ...formData, symbol: e.target.value })
                        }
                        placeholder="🏆"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Event Type
                      </label>
                      <select
                        value={formData.eventType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            eventType: e.target.value as
                              | "TOURNAMENT"
                              | "SCORED",
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="TOURNAMENT">Tournament</option>
                        <option value="SCORED">Scored</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as
                              | "UPCOMING"
                              | "IN_PROGRESS"
                              | "COMPLETED",
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="UPCOMING">Upcoming</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.startTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startTime: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Location
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Points Structure
                      </label>
                      <select
                        value={
                          POINT_PRESETS.findIndex(
                            (preset) =>
                              JSON.stringify(preset.value) ===
                              JSON.stringify(formData.points)
                          ) >= 0
                            ? POINT_PRESETS.findIndex(
                                (preset) =>
                                  JSON.stringify(preset.value) ===
                                  JSON.stringify(formData.points)
                              )
                            : 0
                        }
                        onChange={(e) => {
                          const selectedPreset =
                            POINT_PRESETS[parseInt(e.target.value)];
                          setFormData({
                            ...formData,
                            points: selectedPreset.value,
                          });
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {POINT_PRESETS.map((preset, index) => (
                          <option key={index} value={index}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.points.map((point, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {index + 1}
                            {getOrdinalSuffix(index + 1)}: {point} pts
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Add Event
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {editingEvent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Edit Event
                </h3>
                <form onSubmit={handleUpdateEvent}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            name: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Abbreviation
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.abbreviation}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            abbreviation: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Symbol (Emoji)
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.symbol}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            symbol: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Event Type
                      </label>
                      <select
                        value={editFormData.eventType}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            eventType: e.target.value as
                              | "TOURNAMENT"
                              | "SCORED",
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="TOURNAMENT">Tournament</option>
                        <option value="SCORED">Scored</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        value={editFormData.status}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            status: e.target.value as
                              | "UPCOMING"
                              | "IN_PROGRESS"
                              | "COMPLETED",
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="UPCOMING">Upcoming</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={editFormData.startTime}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            startTime: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Location
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.location}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            location: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Points Structure
                      </label>
                      <select
                        value={
                          POINT_PRESETS.findIndex(
                            (preset) =>
                              JSON.stringify(preset.value) ===
                              JSON.stringify(editFormData.points)
                          ) >= 0
                            ? POINT_PRESETS.findIndex(
                                (preset) =>
                                  JSON.stringify(preset.value) ===
                                  JSON.stringify(editFormData.points)
                              )
                            : 0
                        }
                        onChange={(e) => {
                          const selectedPreset =
                            POINT_PRESETS[parseInt(e.target.value)];
                          setEditFormData({
                            ...editFormData,
                            points: selectedPreset.value,
                          });
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {POINT_PRESETS.map((preset, index) => (
                          <option key={index} value={index}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {editFormData.points.map((point, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {index + 1}
                            {getOrdinalSuffix(index + 1)}: {point} pts
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setEditingEvent(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Update Event
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
