"use client";

import { useState, useEffect } from "react";
import { Event } from "@prisma/client";
import Link from "next/link";

interface ScheduledEvent extends Omit<Event, "startTime" | "duration"> {
  startTime?: Date | null;
  duration?: number | null; // in minutes
  dayIndex?: number; // 0 = Aug 22, 1 = Aug 23, 2 = Aug 24
}

interface PublicScheduleCalendarProps {
  events: Event[];
}

// Create time slots for 5-minute increments from 9 AM to 10 PM (156 slots per day)
const TIME_SLOTS = Array.from({ length: 156 }, (_, i) => i * 5 + 540); // 540 minutes = 9 AM
const DAYS = [
  { date: "2025-08-22", label: "Friday, Aug 22" },
  { date: "2025-08-23", label: "Saturday, Aug 23" },
  { date: "2025-08-24", label: "Sunday, Aug 24" },
];

const formatEventType = (eventType: string) => {
  switch (eventType) {
    case "COMBINED_TEAM":
      return "Combined Team";
    case "TOURNAMENT":
      return "Tournament";
    case "SCORED":
      return "Scored";
    default:
      return eventType;
  }
};

export default function PublicScheduleCalendar({
  events,
}: PublicScheduleCalendarProps) {
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);

  useEffect(() => {
    // Ensure events is an array before processing
    if (!Array.isArray(events)) {
      console.warn("Events is not an array:", events);
      setScheduledEvents([]);
      return;
    }

    // Ensure events array is not empty and has valid data
    if (events.length === 0) {
      setScheduledEvents([]);
      return;
    }

    // Initialize events with default scheduling if they don't have startTime
    const initializedEvents = events
      .map((event, index) => {
        try {
          return {
            ...event,
            startTime: event.startTime ? new Date(event.startTime) : null,
            duration: event.duration || 60, // Use actual duration or default to 1 hour
            dayIndex: event.startTime
              ? getDayIndex(new Date(event.startTime))
              : undefined,
          } as ScheduledEvent;
        } catch (error) {
          console.error("Error processing event:", event, error);
          return null;
        }
      })
      .filter((event): event is ScheduledEvent => event !== null); // Remove any null events

    setScheduledEvents(initializedEvents);
  }, [events]);

  const getDayIndex = (date: Date): number => {
    const day = date.getDate();
    if (day === 22) return 0;
    if (day === 23) return 1;
    if (day === 24) return 2;
    return 0; // Default to first day
  };

  const getYFromTimeSlot = (timeSlot: number): number => {
    // Convert 5-minute time slot directly to pixel position
    // Since we start at 9 AM (540 minutes), we need to adjust the positioning
    return (timeSlot - 108) * 5; // 108 = 540 / 5, 5px per 5-minute slot
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Convert to 12-hour format without leading zeros
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours >= 12 ? "PM" : "AM";

    // Add minutes only if they're not 0
    if (minutes === 0) {
      return `${displayHours} ${ampm}`;
    } else {
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    }
  };

  const getEventColor = (location: string | null): string => {
    if (!location) return "bg-gray-500";

    // Generate a consistent color based on the location string
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
      "bg-emerald-500",
      "bg-violet-500",
      "bg-rose-500",
      "bg-sky-500",
      "bg-lime-500",
      "bg-amber-500",
    ];

    // Use a simple hash function to get consistent colors for the same location
    let hash = 0;
    for (let i = 0; i < location.length; i++) {
      const char = location.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  const getEventPositioning = (event: ScheduledEvent, dayIndex: number) => {
    const eventsOnSameDay = scheduledEvents.filter(
      (e) => e.dayIndex === dayIndex
    );

    const overlappingEvents = eventsOnSameDay.filter((otherEvent) => {
      if (otherEvent.id === event.id) return false;
      const eventStart = event.startTime?.getTime() || 0;
      const eventEnd = eventStart + (event.duration || 60) * 60000;
      const otherStart = otherEvent.startTime?.getTime() || 0;
      const otherEnd = otherStart + (otherEvent.duration || 60) * 60000;
      return eventStart < otherEnd && eventEnd > otherStart;
    });

    if (overlappingEvents.length === 0) {
      return { left: "1px", right: "1px", width: "auto" };
    }

    // Sort overlapping events by start time
    const allOverlapping = [event, ...overlappingEvents].sort(
      (a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0)
    );
    const eventIndex = allOverlapping.findIndex((e) => e.id === event.id);

    // Calculate positioning for up to 3 events side by side
    const maxEvents = Math.min(3, allOverlapping.length);
    const eventWidth = `calc((100% - ${maxEvents + 1}px) / ${maxEvents})`;
    const left = `calc(${eventIndex} * (100% / ${maxEvents}) + ${
      eventIndex + 1
    }px)`;

    return { left, right: "auto", width: eventWidth };
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Desktop Calendar View */}
      <div className="hidden lg:block p-6">
        <div className="flex">
          {/* Time labels on the left */}
          <div className="w-16 flex-shrink-0" style={{ zIndex: 5 }}>
            {/* Empty space to match day header height */}
            <div
              className="border-b border-gray-200"
              style={{ height: "48px", zIndex: 5 }}
            >
              {/* Empty space to match day header height */}
            </div>
            {TIME_SLOTS.filter((_, index) => index % 12 === 0).map(
              (minutes) => {
                const hour = Math.floor(minutes / 60);
                return (
                  <div
                    key={minutes}
                    className="border-b border-gray-200 text-xs text-gray-500 flex items-center justify-center"
                    style={{ height: "60px", zIndex: 5 }}
                  >
                    {hour === 12
                      ? "12 PM"
                      : hour > 12
                      ? `${hour - 12} PM`
                      : `${hour} AM`}
                  </div>
                );
              }
            )}
          </div>

          {/* Day columns */}
          <div className="ml-16 grid grid-cols-3 flex-1">
            {DAYS.map((day, dayIndex) => (
              <div
                key={day.date}
                className="border-r border-gray-200 last:border-r-0"
              >
                {/* Day header */}
                <div
                  className="bg-gray-50 p-3 text-center font-medium text-gray-900 border-b border-gray-200"
                  style={{ zIndex: 5 }}
                >
                  {day.label}
                </div>

                {/* Time slots */}
                <div className="relative" style={{ height: "780px" }}>
                  {/* Hour grid lines that extend across the calendar */}
                  {Array.from({ length: 14 }, (_, i) => {
                    const hour = 9 + i; // Start at 9 AM, go to 10 PM
                    const minutes = hour * 60;
                    return (
                      <div
                        key={minutes}
                        className="absolute left-0 right-0 border-b border-gray-200"
                        style={{
                          top: `${i * 60}px`,
                          height: "60px",
                          zIndex: 0,
                        }}
                      />
                    );
                  })}

                  {/* 30-minute grid lines for better readability */}
                  {Array.from({ length: 28 }, (_, i) => {
                    const minutes = i * 30 + 540; // Start at 9 AM (540 minutes), every 30 minutes
                    const hour = Math.floor(minutes / 60);
                    const minute = minutes % 60;

                    // Skip hour markers (they're already handled above)
                    if (minute === 0) return null;

                    return (
                      <div
                        key={minutes}
                        className="absolute left-0 right-0 border-b border-gray-100"
                        style={{
                          top: `${((minutes - 540) / 5) * 5}px`,
                          height: "5px",
                          zIndex: 0,
                        }}
                        title={(() => {
                          const displayHour =
                            hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                          const ampm = hour >= 12 ? "PM" : "AM";
                          return `${displayHour}:${minute
                            .toString()
                            .padStart(2, "0")} ${ampm}`;
                        })()}
                      />
                    );
                  }).filter(Boolean)}

                  {/* Scheduled events for this day */}
                  {scheduledEvents
                    .filter((event) => event.dayIndex === dayIndex)
                    .map((event) => {
                      const startHour = event.startTime?.getHours() || 0;
                      const startMinute = event.startTime?.getMinutes() || 0;
                      // Convert to 5-minute increments for positioning
                      const totalMinutes = startHour * 60 + startMinute;
                      // Since we start at 9 AM, we need to adjust the time slot calculation
                      const adjustedMinutes = totalMinutes - 540; // 540 = 9 AM
                      const fiveMinuteSlots = adjustedMinutes / 5;
                      const top = getYFromTimeSlot(fiveMinuteSlots + 108); // Add back the offset for positioning
                      // Calculate height based on duration: 5px per 5-minute slot
                      const height = Math.max(
                        25,
                        ((event.duration || 60) / 5) * 5
                      );
                      const positioning = getEventPositioning(event, dayIndex);

                      return (
                        <div
                          key={event.id}
                          className={`absolute text-white p-2 rounded text-sm overflow-hidden z-10 ${getEventColor(
                            event.location
                          )}`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            minHeight: "30px",
                            left: positioning.left,
                            right: positioning.right,
                            width: positioning.width,
                          }}
                        >
                          {/* Event Type Pill - only show when not overlapping */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium truncate flex-1">
                              {event.name}
                            </div>
                            {(() => {
                              const eventsOnSameDay = scheduledEvents.filter(
                                (e) => e.dayIndex === dayIndex
                              );
                              const overlappingCount = eventsOnSameDay.filter(
                                (otherEvent) => {
                                  if (otherEvent.id === event.id) return false;
                                  const eventStart =
                                    event.startTime?.getTime() || 0;
                                  const eventEnd =
                                    eventStart + (event.duration || 60) * 60000;
                                  const otherStart =
                                    otherEvent.startTime?.getTime() || 0;
                                  const otherEnd =
                                    otherStart +
                                    (otherEvent.duration || 60) * 60000;
                                  return (
                                    eventStart < otherEnd &&
                                    eventEnd > otherStart
                                  );
                                }
                              ).length;

                              // Only show pill when no overlapping events
                              if (overlappingCount === 0) {
                                return (
                                  <div
                                    className={`px-1 py-0.5 rounded-full text-[10px] font-medium ml-1 flex-shrink-0 ${
                                      event.eventType === "TOURNAMENT"
                                        ? "bg-yellow-400 text-yellow-900"
                                        : "bg-blue-400 text-blue-900"
                                    }`}
                                  >
                                    {formatEventType(event.eventType)}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          {event.location && (
                            <div className="text-xs opacity-75 font-medium">
                              {event.location}
                            </div>
                          )}
                          <div className="text-xs opacity-90">
                            {event.startTime && formatTime(event.startTime)}
                            {event.startTime && event.duration && (
                              <>
                                {" "}
                                –{" "}
                                {formatTime(
                                  new Date(
                                    event.startTime.getTime() +
                                      event.duration * 60000
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Calendar View */}
      <div className="lg:hidden p-4">
        {DAYS.map((day, dayIndex) => {
          const dayEvents = scheduledEvents
            .filter((event) => event.dayIndex === dayIndex)
            .sort(
              (a, b) =>
                (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0)
            );

          // Find the time range for this day
          let dayStart = 9 * 60; // 9 AM in minutes
          let dayEnd = 22 * 60; // 10 PM in minutes

          if (dayEvents.length > 0) {
            const firstEventTime = dayEvents[0].startTime;
            const lastEventTime = dayEvents[dayEvents.length - 1];
            const lastEventEnd =
              lastEventTime.startTime && lastEventTime.duration
                ? new Date(
                    lastEventTime.startTime.getTime() +
                      lastEventTime.duration * 60000
                  )
                : lastEventTime.startTime;

            if (firstEventTime) {
              const firstMinutes =
                firstEventTime.getHours() * 60 + firstEventTime.getMinutes();
              dayStart = Math.max(9 * 60, firstMinutes - 60); // Start 1 hour before first event or 9 AM
            }

            if (lastEventEnd) {
              const lastMinutes =
                lastEventEnd.getHours() * 60 + lastEventEnd.getMinutes();
              dayEnd = Math.min(22 * 60, lastMinutes + 60); // End 1 hour after last event or 10 PM
            }
          }

          const totalMinutes = dayEnd - dayStart;
          const timeSlots = Math.ceil(totalMinutes / 30); // 30-minute slots for mobile

          return (
            <div key={day.date} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {day.label}
              </h3>

              {dayEvents.length === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  No events scheduled
                </p>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Time slots */}
                  <div
                    className="relative"
                    style={{ height: `${timeSlots * 40}px` }}
                  >
                    {/* Time labels on the left */}
                    <div className="absolute left-0 top-0 w-16 bg-gray-50 border-r border-gray-200 h-full">
                      {Array.from({ length: timeSlots + 1 }, (_, i) => {
                        const time = dayStart + i * 30;
                        const hour = Math.floor(time / 60);
                        const minute = time % 60;
                        const displayHour =
                          hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                        const ampm = hour >= 12 ? "PM" : "AM";
                        const timeString =
                          minute === 0
                            ? `${displayHour} ${ampm}`
                            : `${displayHour}:${minute
                                .toString()
                                .padStart(2, "0")} ${ampm}`;

                        return (
                          <div
                            key={i}
                            className="text-xs text-gray-500 flex items-center justify-center border-b border-gray-100"
                            style={{ height: "40px" }}
                          >
                            {timeString}
                          </div>
                        );
                      })}
                    </div>

                    {/* 30-minute grid lines for better readability */}
                    {Array.from({ length: timeSlots + 1 }, (_, i) => {
                      const time = dayStart + i * 30;
                      return (
                        <div
                          key={`grid-${i}`}
                          className="absolute left-0 right-0 border-b border-gray-100"
                          style={{
                            top: `${i * 40}px`,
                            height: "1px",
                            zIndex: 0,
                          }}
                        />
                      );
                    })}

                    {/* Events */}
                    <div className="ml-16 relative h-full">
                      {dayEvents.map((event) => {
                        if (!event.startTime) return null;

                        const eventStartMinutes =
                          event.startTime.getHours() * 60 +
                          event.startTime.getMinutes();
                        const eventEndMinutes =
                          eventStartMinutes + (event.duration || 60);

                        const top = ((eventStartMinutes - dayStart) / 30) * 40;
                        const height =
                          ((eventEndMinutes - eventStartMinutes) / 30) * 40;

                        // Check for overlapping events
                        const overlappingEvents = dayEvents.filter(
                          (otherEvent) => {
                            if (otherEvent.id === event.id) return false;
                            if (!otherEvent.startTime) return false;

                            const otherStartMinutes =
                              otherEvent.startTime.getHours() * 60 +
                              otherEvent.startTime.getMinutes();
                            const otherEndMinutes =
                              otherStartMinutes + (otherEvent.duration || 60);

                            return (
                              eventStartMinutes < otherEndMinutes &&
                              eventEndMinutes > otherStartMinutes
                            );
                          }
                        );

                        // Calculate positioning for overlapping events
                        let left = "1px";
                        let width = "auto";

                        if (overlappingEvents.length > 0) {
                          // Sort all overlapping events by start time
                          const allOverlapping = [
                            event,
                            ...overlappingEvents,
                          ].sort(
                            (a, b) =>
                              (a.startTime?.getTime() || 0) -
                              (b.startTime?.getTime() || 0)
                          );
                          const eventIndex = allOverlapping.findIndex(
                            (e) => e.id === event.id
                          );

                          // Calculate positioning for up to 3 events side by side
                          const maxEvents = Math.min(3, allOverlapping.length);
                          const eventWidth = `calc((100% - ${
                            maxEvents + 1
                          }px) / ${maxEvents})`;
                          left = `calc(${eventIndex} * (100% / ${maxEvents}) + ${
                            eventIndex + 1
                          }px)`;
                          width = eventWidth;
                        }

                        return (
                          <Link
                            key={event.id}
                            href={`/events/${event.abbreviation}`}
                            className={`absolute rounded text-white p-2 cursor-pointer hover:opacity-80 transition-opacity z-10 ${getEventColor(
                              event.location
                            )}`}
                            style={{
                              top: `${top}px`,
                              height: `${Math.max(height, 30)}px`,
                              minHeight: "30px",
                              left,
                              right: "auto",
                              width,
                            }}
                          >
                            {/* Event Type Pill - only show when not overlapping */}
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-sm truncate flex-1">
                                {event.name}
                              </div>
                              {(() => {
                                // Check for overlapping events
                                const overlappingEvents = dayEvents.filter(
                                  (otherEvent) => {
                                    if (otherEvent.id === event.id)
                                      return false;
                                    if (!otherEvent.startTime) return false;

                                    const otherStartMinutes =
                                      otherEvent.startTime.getHours() * 60 +
                                      otherEvent.startTime.getMinutes();
                                    const otherEndMinutes =
                                      otherStartMinutes +
                                      (otherEvent.duration || 60);

                                    return (
                                      eventStartMinutes < otherEndMinutes &&
                                      eventEndMinutes > otherStartMinutes
                                    );
                                  }
                                );

                                // Only show pill when no overlapping events
                                if (overlappingEvents.length === 0) {
                                  return (
                                    <div
                                      className={`px-1 py-0.5 rounded-full text-[10px] font-medium ml-1 flex-shrink-0 ${
                                        event.eventType === "TOURNAMENT"
                                          ? "bg-yellow-400 text-yellow-900"
                                          : "bg-blue-400 text-blue-900"
                                      }`}
                                    >
                                      {formatEventType(event.eventType)}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            {event.location && (
                              <div className="text-xs opacity-90 truncate">
                                📍 {event.location}
                              </div>
                            )}
                            <div className="text-xs opacity-90">
                              {formatTime(event.startTime)}
                              {event.duration && (
                                <>
                                  {" "}
                                  –{" "}
                                  {formatTime(
                                    new Date(
                                      event.startTime.getTime() +
                                        event.duration * 60000
                                    )
                                  )}
                                </>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
