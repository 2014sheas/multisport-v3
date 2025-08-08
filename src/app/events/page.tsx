"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";

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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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
      const response = await fetch("/api/events");
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Event Schedule
        </h1>
        <p className="text-gray-600">
          Stay updated with all upcoming events and results
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Current time:{" "}
          {new Date().toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </p>
      </div>

      {/* Event Status Summary */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Event Overview
          </h2>
          <div className="flex space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {events.filter((e) => e.status === "UPCOMING").length} Upcoming
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {events.filter((e) => e.status === "IN_PROGRESS").length} In
              Progress
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {events.filter((e) => e.status === "COMPLETED").length} Completed
            </span>
          </div>
        </div>
      </div>

      {/* Events Grid */}
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
                <MapPin className="w-4 h-4 text-gray-400" />
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
            Check back soon for upcoming events!
          </p>
        </div>
      )}
    </div>
  );
}
