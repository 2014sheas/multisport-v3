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
  const [draftTime, setDraftTime] = useState<Date | null>(null);

  useEffect(() => {
    // Fetch draft time from API
    fetchDraftTime();
  }, []);

  useEffect(() => {
    if (!draftTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = draftTime.getTime() - now;

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
  }, [draftTime]);

  const fetchDraftTime = async () => {
    try {
      const response = await fetch("/api/draft-time");
      const data = await response.json();
      if (data.draftTime) {
        setDraftTime(new Date(data.draftTime));
      } else {
        // Default to tomorrow 8 PM if no draft time set
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(20, 0, 0, 0);
        setDraftTime(tomorrow);
      }
    } catch (error) {
      console.error("Error fetching draft time:", error);
      // Default fallback
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(20, 0, 0, 0);
      setDraftTime(tomorrow);
    }
  };

  const formatDraftTime = (date: Date) => {
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
          <h2 className="text-2xl font-bold text-gray-900">Draft Countdown</h2>
        </div>

        {draftTime && (
          <div className="mb-6">
            <p className="text-gray-600 mb-2">Draft starts on:</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDraftTime(draftTime)}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Player Rankings
          </h3>
          <p className="text-gray-600 mb-4">
            Check out the current player rankings
          </p>
          <a
            href="/rankings"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            View Rankings
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Events</h3>
          <p className="text-gray-600 mb-4">
            See all the exciting events planned
          </p>
          <a
            href="/events"
            className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            View Events
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Clock className="w-12 h-12 text-orange-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Vote on Players
          </h3>
          <p className="text-gray-600 mb-4">
            Help establish player rankings by voting
          </p>
          <a
            href="/vote"
            className="inline-block bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
          >
            Start Voting
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Draft Room
          </h3>
          <p className="text-gray-600 mb-4">
            The draft interface will be available soon
          </p>
          <a
            href="/draft"
            className="inline-block bg-gray-400 text-white px-4 py-2 rounded-md cursor-not-allowed"
          >
            Coming Soon
          </a>
        </div>
      </div>

      {/* Pre-Draft Message */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🏆 Get Ready!
        </h3>
        <p className="text-yellow-700">
          The draft is approaching! Make sure to check the player rankings and
          start thinking about your strategy. Team captains will be able to
          draft their teams when the countdown reaches zero.
        </p>
      </div>
    </div>
  );
}
