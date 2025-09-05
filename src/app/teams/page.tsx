"use client";

import { useState, useEffect } from "react";
import { Users, Trophy, Star } from "lucide-react";
import Link from "next/link";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  averageRating: number;
  logo?: string | null;
  captain?: {
    id: string;
    name: string;
    rating: number;
  };
  members: {
    id: string;
    name: string;
    rating: number;
  }[];
}

interface Event {
  id: string;
  name: string;
  abbreviation: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [events, setEvents] = useState<Event[]>([]);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchCurrentYear();
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [selectedEventId, currentYear]);

  const fetchCurrentYear = async () => {
    try {
      const response = await fetch("/api/current-year");
      const data = await response.json();
      setCurrentYear(data.year || new Date().getFullYear());
    } catch (error) {
      console.error("Error fetching current year:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/teams?year=${currentYear}`);
      const data = await response.json();
      setTeams(data.data?.teams || []);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
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
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Teams Yet
          </h3>
          <p className="text-gray-600">
            Teams will be assigned by administrators before the event.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.abbreviation}`}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 hover:shadow-lg transition-shadow cursor-pointer"
              style={{ borderLeftColor: team.color }}
            >
              <div className="flex items-center space-x-3 mb-4">
                {team.logo ? (
                  <img
                    src={team.logo}
                    alt={`${team.name} logo`}
                    className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.abbreviation}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {team.name}
                  </h3>
                  <p className="text-sm text-gray-600">{team.abbreviation}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Avg Rating</div>
                  <div className="text-lg font-bold text-blue-600">
                    {team.averageRating}
                  </div>
                </div>
              </div>

              {team.members.length === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  No players assigned yet
                </p>
              ) : (
                <div className="space-y-2">
                  {team.members
                    .sort((a, b) => b.rating - a.rating)
                    .map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">
                            {member.name}
                          </span>
                          {team.captain && team.captain.id === member.id && (
                            <Star
                              className="w-4 h-4 text-yellow-500 ml-1"
                              fill="currentColor"
                            />
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {member.rating}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
