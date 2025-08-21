"use client";

import { useState, useEffect } from "react";
import { Event as PrismaEvent } from "@prisma/client";
import { useSession } from "next-auth/react";
import EventScheduleCalendar from "../../../components/EventScheduleCalendar";

// Use the Prisma Event type directly since it already includes duration
type Event = PrismaEvent;

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.isAdmin) {
      fetchEvents();
    }
  }, [status, session]);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/admin/events", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });

      if (response.ok) {
        const data = await response.json();
        // The API returns { events: [...] }, so we need to extract the events array
        const eventsArray = data.events || [];
        setEvents(eventsArray);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch events:", response.status, errorText);
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleUpdate = async (updatedEvents: Event[]) => {
    // This is now just for local state updates - no API calls
    setEvents(updatedEvents);
  };

  const handleScheduleSubmit = async (updatedEvents: Event[]) => {
    try {
      const response = await fetch("/api/admin/schedule", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events: updatedEvents }),
      });

      if (response.ok) {
        setEvents(updatedEvents);
        // No alert - just update the state
      } else {
        throw new Error("Failed to update schedule");
      }
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert("Failed to update schedule. Please try again.");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You must be an admin to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Event Schedule</h1>
        <p className="mt-2 text-sm text-gray-600">
          Drag and drop events to schedule them across August 22-24, 2024.
          Resize events to set their duration.
        </p>
      </div>

      {loading ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading events...</p>
        </div>
      ) : events && events.length > 0 ? (
        <EventScheduleCalendar
          events={events}
          onScheduleUpdate={handleScheduleUpdate}
          onScheduleSubmit={handleScheduleSubmit}
        />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-500">
            No events found. Please create some events first.
          </p>
        </div>
      )}
    </div>
  );
}
