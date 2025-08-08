"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, Users } from "lucide-react";

export default function HomePage() {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [eventTime, setEventTime] = useState<Date | null>(null);

  useEffect(() => {
    // Fetch event time from API
    fetchEventTime();
  }, []);

  useEffect(() => {
    if (!eventTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = eventTime.getTime() - now;

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [eventTime]);

  const fetchEventTime = async () => {
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
  };

  const formatEventTime = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Multisport Games 2025
        </h1>
        <p className="text-lg text-gray-600">Dudley Takeover</p>
      </div>

      {/* Countdown Section */}
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

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Players</h3>
          <p className="text-gray-600 mb-4">
            Check out all of the participants
          </p>
          <a
            href="/rankings"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            View Players
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Events</h3>
          <p className="text-gray-600 mb-4">
            See all scheduled events and results
          </p>
          <a
            href="/events"
            className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            View Events
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Teams</h3>
          <p className="text-gray-600 mb-4">View team rosters and captains</p>
          <a
            href="/teams"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            View Teams
          </a>
        </div>
      </div>

      {/* Pre-Event Message */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🏆 Get Ready!
        </h3>
        <p className="text-yellow-700">
          The first event is approaching! Make sure to check the team rosters
          and start thinking about your strategy.
        </p>
      </div>
    </div>
  );
}
