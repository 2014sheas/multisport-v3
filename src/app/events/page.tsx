"use client";

import { useState, useEffect } from "react";

interface Event {
  id: string;
  name: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      const data = await response.json();
      setEvents(data.events);
    } catch (error) {
      console.error("Error fetching events:", error);
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
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Events</h1>
        <p className="text-gray-600">List of upcoming events</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No Events Yet
          </h2>
          <p className="text-gray-600">Events will be added here soon.</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Event List</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <div
                key={event.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-medium text-gray-900">
                  {event.name}
                </h3>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
