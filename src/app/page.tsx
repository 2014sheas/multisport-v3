"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Clock, Calendar, Users, Trophy, TrendingUp } from "lucide-react";
import PerformanceMonitor from "@/components/PerformanceMonitor";

interface TeamStanding {
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamColor: string;
  earnedPoints: number;
  projectedPoints: number;
  firstPlaceFinishes: number;
  secondPlaceFinishes: number;
  eventResults: EventResult[];
}

interface EventResult {
  eventId: string;
  eventName: string;
  eventSymbol: string;
  eventAbbreviation: string;
  points: number;
  position: number;
  isProjected: boolean;
}

interface Event {
  id: string;
  name: string;
  abbreviation: string;
  symbol: string;
  eventType: string;
  status: string;
  startTime: string;
  location: string;
  points: number[];
  finalStandings: string[] | null;
}

export default function HomePage() {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [eventTime, setEventTime] = useState<Date | null>(null);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gamesStarted, setGamesStarted] = useState(false);

  // Memoize expensive calculations
  const currentOrRecentEvent = useMemo(() => {
    if (!events.length) return null;

    // Find current event in progress
    const currentEvent = events.find((event) => event.status === "IN_PROGRESS");
    if (currentEvent) return currentEvent;

    // Find most recently completed event
    const completedEvents = events.filter(
      (event) => event.status === "COMPLETED"
    );
    if (completedEvents.length > 0) {
      return completedEvents[completedEvents.length - 1];
    }

    // Find next upcoming event
    const upcomingEvents = events.filter(
      (event) => event.status === "UPCOMING"
    );
    if (upcomingEvents.length > 0) {
      return upcomingEvents[0];
    }

    return null;
  }, [events]);

  useEffect(() => {
    if (!eventTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = eventTime.getTime() - now;

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setGamesStarted(true);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      setGamesStarted(false);
    }, 1000);

    return () => clearInterval(timer);
  }, [eventTime]);

  const fetchEventTime = useCallback(async () => {
    try {
      const response = await fetch("/api/event-time");
      const data = await response.json();
      if (data.eventTime) {
        setEventTime(new Date(data.eventTime));
      } else {
        // Default to tomorrow 8 PM if no event time set
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(20, 0, 0, 0);
        setEventTime(tomorrow);
      }
    } catch (error) {
      console.error("Error fetching event time:", error);
      // Default fallback
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(20, 0, 0, 0);
      setEventTime(tomorrow);
    }
  }, []);

  const fetchStandingsAndEvents = useCallback(async () => {
    try {
      const [standingsResponse, eventsResponse] = await Promise.all([
        fetch("/api/standings"),
        fetch("/api/events"),
      ]);

      if (standingsResponse.ok) {
        const standingsData = await standingsResponse.json();
        setStandings(standingsData.standings || []);
      }

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData.events || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const formatEventTime = useCallback((date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }, []);

  const getEventStatusText = useCallback((event: Event) => {
    switch (event.status) {
      case "IN_PROGRESS":
        return "🏃‍♂️ In Progress";
      case "COMPLETED":
        return "✅ Completed";
      case "UPCOMING":
        return "⏰ Upcoming";
      default:
        return "📋 Scheduled";
    }
  }, []);

  const getEventProgress = useCallback(
    (event: Event) => {
      if (event.status === "COMPLETED" && event.finalStandings) {
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Final Results:</h4>
            <div className="space-y-2">
              {event.finalStandings.slice(0, 3).map((teamId, index) => {
                const team = standings.find((s) => s.teamId === teamId);
                if (!team) return null;

                return (
                  <div
                    key={teamId}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                        style={{ backgroundColor: team.teamColor }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {team.teamName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {team.teamAbbreviation}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {event.points[index] || 0} pts
                      </div>
                      <div className="text-sm text-gray-500">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      if (event.status === "IN_PROGRESS") {
        return (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">🏃‍♂️</div>
            <p className="text-gray-600">Event is currently in progress!</p>
            <p className="text-sm text-gray-500 mt-1">
              Results will be posted when completed.
            </p>
          </div>
        );
      }

      return (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">⏰</div>
          <p className="text-gray-600">
            Event starts at {new Date(event.startTime).toLocaleTimeString()}
          </p>
        </div>
      );
    },
    [standings]
  );

  useEffect(() => {
    // Fetch event time and data
    fetchEventTime();
    fetchStandingsAndEvents();
  }, [fetchEventTime, fetchStandingsAndEvents]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Multisport Games 2025
        </h1>
        <p className="text-lg text-gray-600">Dudley Takeover</p>
      </div>

      {!gamesStarted ? (
        /* Pre-Event Countdown Section */
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              Multisport Countdown
            </h2>
          </div>

          {eventTime && (
            <div className="mb-6">
              <p className="text-gray-600 mb-2">The games start on:</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatEventTime(eventTime)}
              </p>
            </div>
          )}

          {timeLeft && (
            <div className="grid grid-cols-4 gap-4 max-w-lg mx-auto">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-3xl font-bold text-blue-600">
                  {timeLeft.days}
                </div>
                <div className="text-sm text-gray-600">Days</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-3xl font-bold text-blue-600">
                  {timeLeft.hours}
                </div>
                <div className="text-sm text-gray-600">Hours</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-3xl font-bold text-blue-600">
                  {timeLeft.minutes}
                </div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-3xl font-bold text-blue-600">
                  {timeLeft.seconds}
                </div>
                <div className="text-sm text-gray-600">Seconds</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Post-Event Content */
        <>
          {/* Current Standings */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-center mb-6">
              <Trophy className="w-8 h-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">
                Current Standings
              </h2>
            </div>

            {standings.length > 0 ? (
              <div className="space-y-3">
                {standings.slice(0, 5).map((team, index) => (
                  <div
                    key={team.teamId}
                    className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg"
                        style={{ backgroundColor: team.teamColor }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {team.teamName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {team.teamAbbreviation}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 text-lg">
                        {team.earnedPoints} pts
                      </div>
                      <div className="text-sm text-gray-500">
                        {team.firstPlaceFinishes} 🥇 {team.secondPlaceFinishes}{" "}
                        🥈
                      </div>
                    </div>
                  </div>
                ))}
                {standings.length > 5 && (
                  <div className="text-center pt-2">
                    <Link
                      href="/standings"
                      className="text-green-600 hover:text-green-700 font-medium"
                    >
                      View Full Standings →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-600">
                No standings available yet.
              </p>
            )}
          </div>

          {/* Event Progress */}
          {currentOrRecentEvent && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl p-8 mb-8">
              <div className="flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Event Progress
                </h2>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {currentOrRecentEvent.name}
                    </h3>
                    <p className="text-gray-600">
                      {currentOrRecentEvent.location || "Location TBD"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {getEventStatusText(currentOrRecentEvent)}
                    </div>
                    <div className="text-2xl">
                      {currentOrRecentEvent.symbol}
                    </div>
                  </div>
                </div>

                {getEventProgress(currentOrRecentEvent)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Players</h3>
          <p className="text-gray-600 mb-4">
            Check out all of the participants
          </p>
          <Link
            href="/rankings"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            View Players
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Events</h3>
          <p className="text-gray-600 mb-4">
            See all scheduled events and results
          </p>
          <Link
            href="/events"
            className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            View Events
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Teams</h3>
          <p className="text-gray-600 mb-4">View team rosters and captains</p>
          <Link
            href="/teams"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            View Teams
          </Link>
        </div>
      </div>

      {/* Dynamic Message */}
      {!gamesStarted ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            🏆 Get Ready!
          </h3>
          <p className="text-yellow-700">
            The first event is approaching! Make sure to check the team rosters
            and start thinking about your strategy.
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            🎯 Games Are Live!
          </h3>
          <p className="text-green-700">
            The Multisport Games are in progress! Check the standings above and
            follow the event progress to see how your team is performing.
          </p>
        </div>
      )}

      <PerformanceMonitor pageName="Home" />
    </div>
  );
}
