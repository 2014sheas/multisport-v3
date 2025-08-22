"use client";

import { useState, useRef, useEffect } from "react";
import { Event } from "@prisma/client";

interface ScheduledEvent extends Omit<Event, "startTime" | "duration"> {
  startTime?: Date | null;
  duration?: number | null; // in minutes
  dayIndex?: number; // 0 = Aug 22, 1 = Aug 23, 2 = Aug 24
}

interface EventScheduleCalendarProps {
  events: Event[];
  onScheduleUpdate: (events: Event[]) => void;
  onScheduleSubmit: (events: Event[]) => void;
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

export default function EventScheduleCalendar({
  events,
  onScheduleUpdate,
  onScheduleSubmit,
}: EventScheduleCalendarProps) {
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
    timeString?: string;
    dayIndex?: number;
  }>({ x: 0, y: 0 });
  const [dragPreview, setDragPreview] = useState<{
    dayIndex: number;
    timeSlot: number;
  } | null>(null);
  const [resizingEvent, setResizingEvent] = useState<ScheduledEvent | null>(
    null
  );
  const [isResizing, setIsResizing] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

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
            startTime: event.startTime ? new Date(event.startTime) : undefined,
            duration: event.duration || 60, // Use existing duration or default to 1 hour (will be converted to 5-min increments)
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

  const getTimeFromY = (y: number): number => {
    const rect = calendarRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const relativeY = y - rect.top;
    // Account for calendar header height (day labels) and padding
    const headerHeight = 48; // Day header height
    const padding = 24; // Calendar padding
    const adjustedY = relativeY - headerHeight - padding;
    // Fixed height calculation: 780px / 156 slots = 5px per slot
    const timeSlotHeight = 5; // 5px per 5-minute slot
    const timeSlot = Math.max(0, Math.floor(adjustedY / timeSlotHeight));
    // Convert to actual time (starting from 9 AM = 540 minutes)
    return timeSlot + 108; // 108 = 540 / 5 (9 AM in 5-minute slots)
  };

  const getYFromTime = (time: number): number => {
    // Convert time to 5-minute increments
    const minutes = time * 60;
    const fiveMinuteSlots = minutes / 5;
    return fiveMinuteSlots * 5; // 5px per 5-minute slot
  };

  const getYFromTimeSlot = (timeSlot: number): number => {
    // Convert 5-minute time slot directly to pixel position
    // Since we start at 9 AM (540 minutes), we need to adjust the positioning
    // Now using 60px per hour (12 slots per hour)
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
    if (!location) return "bg-gray-500 hover:bg-gray-600";

    // Generate a consistent color based on the location string
    // This ensures events with the same location get the same color
    // and events with different locations get different colors
    const colors = [
      "bg-blue-500 hover:bg-blue-600",
      "bg-green-500 hover:bg-green-600",
      "bg-purple-500 hover:bg-purple-600",
      "bg-red-500 hover:bg-red-600",
      "bg-yellow-500 hover:bg-yellow-600",
      "bg-pink-500 hover:bg-pink-600",
      "bg-indigo-500 hover:bg-indigo-600",
      "bg-teal-500 hover:bg-teal-600",
      "bg-orange-500 hover:bg-orange-600",
      "bg-cyan-500 hover:bg-cyan-600",
      "bg-emerald-500 hover:bg-emerald-600",
      "bg-violet-500 hover:bg-violet-600",
      "bg-rose-500 hover:bg-rose-600",
      "bg-sky-500 hover:bg-sky-600",
      "bg-lime-500 hover:bg-lime-600",
      "bg-amber-500 hover:bg-amber-600",
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

  const handleDragStart = (
    e: React.DragEvent,
    event: Event | ScheduledEvent
  ) => {
    // Convert ScheduledEvent to Event if needed
    const eventForDrag: Event = {
      ...event,
      startTime: event.startTime || null,
      duration: event.duration || null,
    } as Event;

    setDraggedEvent(eventForDrag);
    setIsDragging(true);
    setDragPosition({ x: e.clientX, y: e.clientY });

    // Set data for the drag operation
    e.dataTransfer.setData("text/plain", event.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedEvent || !calendarRef.current) return;

    const rect = calendarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Determine which day and time slot
    const dayWidth = rect.width / 3;
    const dayIndex = Math.floor(x / dayWidth);
    const timeSlot = getTimeFromY(e.clientY);

    if (dayIndex >= 0 && dayIndex < 3 && timeSlot >= 108 && timeSlot < 264) {
      e.dataTransfer.dropEffect = "move";
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        setDragPosition({ x, y });
        setDragPreview({ dayIndex, timeSlot });
      });
    } else {
      e.dataTransfer.dropEffect = "none";
      requestAnimationFrame(() => {
        setDragPreview(null);
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedEvent && calendarRef.current) {
      const rect = calendarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const dayWidth = rect.width / 3;
      const dayIndex = Math.floor(x / dayWidth);
      const timeSlot = getTimeFromY(e.clientY);

      if (dayIndex >= 0 && dayIndex < 3 && timeSlot >= 108 && timeSlot < 264) {
        // Convert 5-minute slot to hours and minutes (starting from 9 AM)
        const adjustedTimeSlot = timeSlot - 108; // Remove 9 AM offset
        const totalMinutes = adjustedTimeSlot * 5;
        const hours = Math.floor(totalMinutes / 60) + 9; // Add 9 AM offset
        const minutes = totalMinutes % 60;

        const newDate = new Date(
          `2025-08-${22 + dayIndex}T${hours
            .toString()
            .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`
        );

        const updatedEvents = scheduledEvents.map((event) =>
          event.id === draggedEvent.id
            ? {
                ...event,
                startTime: newDate,
                dayIndex,
                duration: Math.max(25, event.duration || 60), // Ensure minimum 5 minutes
              }
            : event
        );

        setScheduledEvents(updatedEvents);
        // Don't call onScheduleUpdate here - just update local state
      }
    }

    setIsDragging(false);
    setDraggedEvent(null);
    setDragPreview(null);
  };

  const handleResizeStart = (e: React.MouseEvent, event: ScheduledEvent) => {
    e.preventDefault();
    setResizingEvent(event);
    setIsResizing(true);
  };

  const handleResize = (e: MouseEvent) => {
    if (isResizing && resizingEvent && calendarRef.current) {
      const rect = calendarRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;

      // Use the same corrected positioning logic as dragging
      const startHour = resizingEvent.startTime?.getHours() || 0;
      const startMinute = resizingEvent.startTime?.getMinutes() || 0;
      const totalMinutes = startHour * 60 + startMinute;
      const fiveMinuteSlots = totalMinutes / 5;
      const startY = getYFromTimeSlot(fiveMinuteSlots);

      const newHeight = Math.max(25, y - startY); // Minimum 5 minutes
      const newDuration = Math.ceil(newHeight / 5) * 5; // Round to nearest 5 minutes

      const updatedEvents = scheduledEvents.map((event) =>
        event.id === resizingEvent.id
          ? { ...event, duration: newDuration }
          : event
      );

      setScheduledEvents(updatedEvents);
    }
  };

  const handleResizeEnd = () => {
    // Don't call onScheduleUpdate here - just update local state
    setIsResizing(false);
    setResizingEvent(null);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", handleResizeEnd);
      return () => {
        document.removeEventListener("mousemove", handleResize);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [isResizing, resizingEvent]);

  // Function to detect overlapping events and calculate positioning
  const getEventPositioning = (event: ScheduledEvent, dayIndex: number) => {
    const eventsOnSameDay = scheduledEventsList.filter(
      (e) => e.dayIndex === dayIndex
    );
    const overlappingEvents = eventsOnSameDay.filter((otherEvent) => {
      if (otherEvent.id === event.id) return false;

      const eventStart = event.startTime?.getTime() || 0;
      const eventEnd = eventStart + (event.duration || 60) * 60000;
      const otherStart = otherEvent.startTime?.getTime() || 0;
      const otherEnd = otherStart + (otherEvent.duration || 60) * 60000;

      // Check if events overlap in time
      return eventStart < otherEnd && eventEnd > otherStart;
    });

    if (overlappingEvents.length === 0) {
      return { left: 1, right: 1, width: "auto" };
    }

    // Sort overlapping events by start time
    const allOverlapping = [...overlappingEvents, event].sort(
      (a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0)
    );

    const eventIndex = allOverlapping.findIndex((e) => e.id === event.id);
    const totalOverlapping = Math.min(allOverlapping.length, 3); // Max 3 events side by side

    if (totalOverlapping === 1) {
      return { left: 1, right: 1, width: "auto" };
    }

    // Calculate width and position for side-by-side display
    const width = `calc((100% - ${
      totalOverlapping + 1
    }px) / ${totalOverlapping})`;
    const left = 1 + eventIndex * (100 / totalOverlapping) + eventIndex * 1; // 1px gap between events

    return {
      left: `${left}%`,
      right: "auto",
      width: width,
    };
  };

  // Add drag end cleanup
  useEffect(() => {
    const handleDragEnd = () => {
      setIsDragging(false);
      setDraggedEvent(null);
      setDragPreview(null);
    };

    document.addEventListener("dragend", handleDragEnd);
    return () => document.removeEventListener("dragend", handleDragEnd);
  }, []);

  const unscheduledEvents = scheduledEvents.filter((event) => !event.startTime);
  const scheduledEventsList = scheduledEvents.filter(
    (event) => event.startTime
  );

  return (
    <div className="space-y-6">
      {/* Submit Schedule Button */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Schedule Changes
            </h3>
            <p className="text-sm text-gray-600">
              Drag and drop events to reschedule them. Changes are not saved
              until you click Submit.
            </p>
          </div>
          <button
            onClick={() =>
              onScheduleSubmit(
                scheduledEvents.map((event) => ({
                  ...event,
                  startTime: event.startTime || null,
                  duration: event.duration || null,
                })) as Event[]
              )
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Submit Schedule
          </button>
        </div>
      </div>

      {/* Unscheduled Events */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Unscheduled Events
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {unscheduledEvents.map((event) => (
            <div
              key={event.id}
              draggable
              onDragStart={(e) => handleDragStart(e, event)}
              className="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300 cursor-move hover:border-gray-400 transition-all duration-200 hover:shadow-md active:scale-95 transform-gpu"
            >
              <div className="font-medium text-gray-900">{event.name}</div>
              <div className="text-sm text-gray-600">
                {formatEventType(event.eventType)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Drag to schedule</div>
            </div>
          ))}
          {unscheduledEvents.length === 0 && (
            <div className="text-gray-500 text-sm">
              All events are scheduled!
            </div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900">
              Event Schedule
            </h3>
          </div>
        </div>
        <div
          ref={calendarRef}
          className={`relative border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 ${
            isDragging ? "border-blue-400 bg-blue-50" : ""
          }`}
          style={{ height: "840px" }} // Height: 14 hours * 60px per hour
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMouseMove={(e) => {
            const rect = calendarRef.current?.getBoundingClientRect();
            if (rect) {
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const dayWidth = rect.width / 3;
              const dayIndex = Math.floor(x / dayWidth);
              const timeSlot = getTimeFromY(y);

              if (
                dayIndex >= 0 &&
                dayIndex < 3 &&
                timeSlot >= 108 &&
                timeSlot < 264
              ) {
                // Convert from 5-minute slots to actual time (starting from 9 AM)
                const adjustedTimeSlot = timeSlot - 108; // Remove 9 AM offset
                const totalMinutes = adjustedTimeSlot * 5;
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                const timeString = `${
                  hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
                }:${minutes.toString().padStart(2, "0")} ${
                  hours >= 12 ? "PM" : "AM"
                }`;

                setDragPosition({
                  x: e.clientX,
                  y: e.clientY,
                  timeString,
                  dayIndex,
                });
              }
            }
          }}
        >
          {/* Time labels - aligned with grid lines */}
          <div className="absolute left-0 top-0 w-16 bg-gray-50 border-r border-gray-200">
            {/* First time label starts below the day header */}
            <div
              className="border-b border-gray-200 text-xs text-gray-500 flex items-center justify-center"
              style={{ height: "48px" }}
            >
              {/* Empty space to match day header height */}
            </div>
            {Array.from({ length: 14 }, (_, i) => {
              const hour = 9 + i; // Start at 9 AM, go to 10 PM
              const minutes = hour * 60;
              return (
                <div
                  key={minutes}
                  className="border-b border-gray-200 text-xs text-gray-500 flex items-center justify-center"
                  style={{ height: "60px" }}
                >
                  {hour === 12
                    ? "12 PM"
                    : hour > 12
                    ? `${hour - 12} PM`
                    : `${hour} AM`}
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          <div className="ml-16 grid grid-cols-3">
            {DAYS.map((day, dayIndex) => (
              <div
                key={day.date}
                className="border-r border-gray-200 last:border-r-0"
              >
                {/* Day header */}
                <div className="bg-gray-50 p-3 text-center font-medium text-gray-900 border-b border-gray-200">
                  {day.label}
                </div>

                {/* Time slots */}
                <div className="relative">
                  {Array.from({ length: 14 }, (_, i) => {
                    const hour = 9 + i; // Start at 9 AM, go to 10 PM
                    const minutes = hour * 60;
                    return (
                      <div
                        key={minutes}
                        className="border-b border-gray-200"
                        style={{ height: "60px" }}
                      />
                    );
                  })}

                  {/* 5-minute grid lines for better precision */}
                  {TIME_SLOTS.filter((_, index) => index % 12 !== 0).map(
                    (minutes) => (
                      <div
                        key={minutes}
                        className="border-b border-gray-100 hover:border-gray-300 transition-colors duration-150"
                        style={{ height: "5px" }}
                        title={(() => {
                          const hour = Math.floor(minutes / 60);
                          const minute = minutes % 60;
                          const displayHour =
                            hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                          const ampm = hour >= 12 ? "PM" : "AM";
                          return minute === 0
                            ? `${displayHour} ${ampm}`
                            : `${displayHour}:${minute
                                .toString()
                                .padStart(2, "0")} ${ampm}`;
                        })()}
                      />
                    )
                  )}

                  {/* Drag Preview */}
                  {dragPreview &&
                    dragPreview.dayIndex === dayIndex &&
                    draggedEvent && (
                      <div
                        className={`absolute border-2 border-dashed opacity-70 text-white p-2 rounded text-sm pointer-events-none z-10 ${getEventColor(
                          draggedEvent.location
                        )}`}
                        style={{
                          top: `${getYFromTimeSlot(dragPreview.timeSlot)}px`,
                          height: `${Math.max(
                            25,
                            draggedEvent.duration || 60
                          )}px`,
                          minHeight: "25px",
                          left: "1px",
                          right: "1px",
                        }}
                      >
                        <div className="font-medium truncate">
                          {draggedEvent.name}
                        </div>
                        {draggedEvent.location && (
                          <div className="text-xs opacity-75 font-medium">
                            {draggedEvent.location}
                          </div>
                        )}
                        <div className="text-xs opacity-90">
                          Drop here to schedule
                        </div>
                      </div>
                    )}

                  {/* Scheduled events for this day */}
                  {scheduledEventsList
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
                          className={`absolute text-white p-2 rounded text-sm overflow-hidden cursor-move transition-all duration-200 active:scale-95 transform-gpu ${getEventColor(
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
                          draggable
                          onDragStart={(e) => handleDragStart(e, event)}
                        >
                          <div className="font-medium truncate">
                            {event.name}
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

                          {/* Overlap indicator */}
                          {(() => {
                            const eventsOnSameDay = scheduledEventsList.filter(
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
                                  eventStart < otherEnd && eventEnd > otherStart
                                );
                              }
                            ).length;

                            if (overlappingCount > 0) {
                              return (
                                <div className="text-xs opacity-60 mt-1">
                                  {overlappingCount + 1} events overlap
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Resize handle - matches event color */}
                          <div
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-80"
                            style={{
                              backgroundColor: "currentColor",
                            }}
                            onMouseDown={(e) => handleResizeStart(e, event)}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Drag preview */}
          {isDragging && draggedEvent && (
            <div
              className="absolute bg-blue-500 text-white p-2 rounded text-sm pointer-events-none z-10"
              style={{
                left: dragPosition.x - 50,
                top: dragPosition.y - 25,
                transform: "translate(-50%, -50%)",
              }}
            >
              {draggedEvent.name}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Calendar View */}
      <div className="lg:hidden p-4">
        {DAYS.map((day, dayIndex) => {
          const dayEvents = scheduledEventsList
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
                          <div
                            key={event.id}
                            className={`absolute rounded text-white p-2 ${getEventColor(
                              event.location
                            )}`}
                            style={{
                              top: `${top}px`,
                              height: `${Math.max(height, 30)}px`,
                              minHeight: "30px",
                              left,
                              right: "1px",
                              width,
                            }}
                          >
                            <div className="font-medium text-sm truncate">
                              {event.name}
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
                          </div>
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
