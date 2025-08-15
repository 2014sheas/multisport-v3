"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import Link from "next/link";

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
  duration?: number;
}

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  averageRating: number;
  averageTrend: number;
  memberCount: number;
  members: TeamMember[];
}

interface TeamMember {
  playerId: string;
  playerName: string;
  rating: number;
  trend: number;
}

export default function EventPage({
  params,
}: {
  params: Promise<{ abbreviation: string }>;
}) {
  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [abbreviation, setAbbreviation] = useState<string>("");

  useEffect(() => {
    const getParams = async () => {
      const { abbreviation: abbrev } = await params;
      setAbbreviation(abbrev);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (abbreviation) {
      fetchEventData();
    }
  }, [abbreviation]);

  const fetchEventData = async () => {
    try {
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${abbreviation}`);
      if (!eventResponse.ok) {
        throw new Error("Event not found");
      }
      const eventData = await eventResponse.json();
      setEvent(eventData.event);

      // Fetch teams with their event-specific ratings
      const teamsResponse = await fetch(`/api/events/${abbreviation}/teams`);
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        setTeams(teamsData.teams);
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamExpansion = (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
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

  const getOrdinalSuffix = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return "st";
    if (n % 10 === 2 && n % 100 !== 12) return "nd";
    if (n % 10 === 3 && n % 100 !== 13) return "rd";
    return "th";
  };

  const TrendIndicator = ({ trend }: { trend: number }) => {
    if (trend === 0) {
      return (
        <div className="flex items-center text-gray-500">
          <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
          <span className="text-xs">-</span>
        </div>
      );
    } else if (trend > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
          <span className="text-xs">+{trend}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
          <span className="text-xs">{trend}</span>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Event Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The event you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Back Button */}
      <div className="mb-4 sm:mb-6">
        <Link
          href="/events"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Events
        </Link>
      </div>

      {/* Event Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-start justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-3xl sm:text-4xl lg:text-5xl">
                {event.symbol}
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  {event.name}
                </h1>
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <span
                    className={`inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${
                      event.eventType === "TOURNAMENT"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {event.eventType}
                  </span>
                  <span
                    className={`inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Date and Time */}
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-900">
                  {new Date(event.startTime).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  {new Date(event.startTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                  {event.duration && (
                    <>
                      {" "}
                      –{" "}
                      {new Date(
                        new Date(event.startTime).getTime() +
                          event.duration * 60000
                      ).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </>
                  )}
                </p>
                {event.status === "UPCOMING" && (
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">
                    {getTimeRemaining(event.startTime)} remaining
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center space-x-3">
              <MapPin className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-900">
                  Location
                </p>
                <p className="text-xs sm:text-sm text-gray-700">
                  {event.location}
                </p>
              </div>
            </div>

            {/* Points Structure */}
            {event.points && event.points.length > 0 && (
              <div className="flex items-center space-x-3">
                <Trophy className="w-6 h-6 text-gray-400" />
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-900">
                    Points Structure
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {event.points.slice(0, 3).map((point, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {index + 1}
                        {getOrdinalSuffix(index + 1)}: {point} pts
                      </span>
                    ))}
                    {event.points.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{event.points.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Rankings */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Preliminary Rankings
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {teams.length > 0 ? (
            teams.map((team, index) => (
              <div key={team.id} className="p-6">
                {/* Team Header - Clickable */}
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
                  onClick={() => toggleTeamExpansion(team.id)}
                >
                  <span
                    className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold"
                    style={{
                      backgroundColor: `${team.color}20`,
                      color: team.color,
                      border: `1px solid ${team.color}40`,
                    }}
                  >
                    {team.name}
                  </span>

                  <div className="flex items-center space-x-4">
                    {/* Team Trend */}
                    <div className="text-right">
                      <TrendIndicator trend={team.averageTrend} />
                      <p className="text-xs text-gray-500">Team Trend</p>
                    </div>

                    {/* Average Rating */}
                    <div className="text-right">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">
                        {team.averageRating.toFixed(0)}
                      </p>
                      <p className="text-xs text-gray-500">Avg Rating</p>
                    </div>

                    {/* Expand/Collapse Icon */}
                    {expandedTeams.has(team.id) ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Team Members - Collapsible */}
                {expandedTeams.has(team.id) && (
                  <div className="mt-4">
                    <div className="space-y-3">
                      {team.members.map((member) => (
                        <div
                          key={member.playerId}
                          className="flex items-center justify-between py-3 px-4 bg-white rounded border shadow-sm"
                        >
                          <span className="text-xs sm:text-sm font-medium text-gray-900">
                            {member.playerName}
                          </span>
                          <div className="flex items-center space-x-4 sm:space-x-6">
                            <div className="text-center">
                              <p className="text-xs sm:text-sm font-semibold text-gray-900">
                                {member.rating}
                              </p>
                              <p className="text-xs text-gray-500">Rating</p>
                            </div>
                            <div className="text-center">
                              <TrendIndicator trend={member.trend} />
                              <p className="text-xs text-gray-500">24h Trend</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              No teams found for this event.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
