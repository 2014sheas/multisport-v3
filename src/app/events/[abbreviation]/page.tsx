"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import TournamentSeeding from "@/components/TournamentSeeding";
import TournamentBracket from "@/components/TournamentBracket";
import CombinedTeamMatch from "@/components/CombinedTeamMatch";

interface Event {
  id: string;
  name: string;
  abbreviation: string;
  symbol: string;
  eventType: "TOURNAMENT" | "SCORED" | "COMBINED_TEAM";
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
  logo?: string | null;
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
  globalRank: number;
}

interface TournamentBracket {
  id: string;
  eventId: string;
  matches: Array<{
    id: string;
    round: number;
    matchNumber: number;
    isWinnersBracket: boolean;
    team1Id: string | null;
    team2Id: string | null;
    winnerId?: string;
    status:
      | "SCHEDULED"
      | "IN_PROGRESS"
      | "COMPLETED"
      | "CANCELLED"
      | "UNDETERMINED";
    team1FromMatchId?: string | null;
    team1IsWinner?: boolean | null;
    team2FromMatchId?: string | null;
    team2IsWinner?: boolean | null;
  }>;
  participants: Array<{
    id: string;
    teamId: string;
    seed?: number;
    isEliminated: boolean;
    eliminationRound?: number;
    finalPosition?: number;
    team: {
      id: string;
      name: string;
      abbreviation: string;
      color: string;
    };
  }>;
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
  const [tournamentBracket, setTournamentBracket] =
    useState<TournamentBracket | null>(null);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmedSeeds, setConfirmedSeeds] = useState<
    { teamId: string; seed: number }[]
  >([]);
  const [editFormData, setEditFormData] = useState({
    name: "",
    abbreviation: "",
    symbol: "",
    eventType: "TOURNAMENT" as "TOURNAMENT" | "SCORED" | "COMBINED_TEAM",
    status: "UPCOMING" as "UPCOMING" | "IN_PROGRESS" | "COMPLETED",
    startTime: "",
    duration: 60,
    location: "",
    points: [10, 7, 4, 2] as number[],
  });

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
      checkAdminStatus();
    }
  }, [abbreviation]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch("/api/admin/check-status");
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin || false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

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

      // Fetch tournament bracket if this is a tournament event and it's not in upcoming status
      if (
        eventData.event.eventType === "TOURNAMENT" &&
        eventData.event.status !== "UPCOMING"
      ) {
        await fetchTournamentBracket(eventData.event.id);
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTournamentBracket = async (eventId: string) => {
    try {
      setBracketLoading(true);
      const response = await fetch(`/api/tournament/bracket/${eventId}`);
      if (response.ok) {
        const bracketData = await response.json();
        setTournamentBracket(bracketData);
      }
    } catch (error) {
      console.error("Error fetching tournament bracket:", error);
    } finally {
      setBracketLoading(false);
    }
  };

  const handleSeedsConfirmed = async (
    seeds: { teamId: string; seed: number }[]
  ) => {
    try {
      // Store seeds in local state for later use
      setConfirmedSeeds(seeds);
    } catch (error) {
      console.error("Error confirming seeds:", error);
    }
  };

  const handleResetTournament = async () => {
    try {
      if (
        !confirm(
          "Are you sure you want to reset this tournament? This will delete the bracket and reset to seeding phase."
        )
      ) {
        return;
      }

      // Delete the existing bracket
      const deleteResponse = await fetch(
        `/api/tournament/bracket/${event?.id}`,
        {
          method: "DELETE",
        }
      );

      if (deleteResponse.ok) {
        // Reset confirmed seeds
        setConfirmedSeeds([]);
        // Refresh data
        await fetchEventData();
        if (event) {
          await fetchTournamentBracket(event.id);
        }
      } else {
        console.error("Failed to delete tournament bracket");
      }
    } catch (error) {
      console.error("Error resetting tournament:", error);
    }
  };

  const handleStartTournament = async (
    seedsArg?: { teamId: string; seed: number }[]
  ) => {
    try {
      // If a bracket already exists, just move the event to IN_PROGRESS
      if (tournamentBracket) {
        // Update event status to IN_PROGRESS
        const updateResponse = await fetch(`/api/admin/events/${event?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: event?.name,
            abbreviation: event?.abbreviation,
            symbol: event?.symbol,
            eventType: event?.eventType,
            status: "IN_PROGRESS",
            startTime: event?.startTime,
            duration: event?.duration,
            location: event?.location,
            points: event?.points,
          }),
        });

        if (updateResponse.ok) {
          // Refresh event data
          await fetchEventData();
        } else {
          console.error("Failed to update event status");
        }
        return;
      }

      // Determine seeds to use (prefer explicit seeds argument)
      const seedsToUse =
        seedsArg && seedsArg.length > 0 ? seedsArg : confirmedSeeds;

      if (!seedsToUse || seedsToUse.length === 0) {
        console.error("No seeds confirmed. Please confirm seeds first.");
        return;
      }

      // Generate the bracket
      const response = await fetch("/api/tournament/generate-bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventId: event?.id,
          seeds: seedsToUse,
        }),
      });

      if (response.ok) {
        // Update event status to IN_PROGRESS
        const updateResponse = await fetch(`/api/admin/events/${event?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: event?.name,
            abbreviation: event?.abbreviation,
            symbol: event?.symbol,
            eventType: event?.eventType,
            status: "IN_PROGRESS",
            startTime: event?.startTime,
            duration: event?.duration,
            location: event?.location,
            points: event?.points,
          }),
        });

        if (updateResponse.ok) {
          // Refresh event data and bracket
          await fetchEventData();
          if (event) {
            await fetchTournamentBracket(event.id);
          }
        } else {
          console.error("Failed to update event status");
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to generate bracket:", errorData);
      }
    } catch (error) {
      console.error("Error starting tournament:", error);
    }
  };

  const handleStartCombinedTeamEvent = async () => {
    try {
      if (!event || teams.length !== 4) {
        alert("This event requires exactly 4 teams to start.");
        return;
      }

      // Randomly shuffle teams and create two combined teams
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      const combinedTeam1 = shuffledTeams.slice(0, 2);
      const combinedTeam2 = shuffledTeams.slice(2, 4);

      // Update event status to IN_PROGRESS
      const updateResponse = await fetch(`/api/admin/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: event.name,
          abbreviation: event.abbreviation,
          symbol: event.symbol,
          eventType: event.eventType,
          status: "IN_PROGRESS",
          startTime: event.startTime,
          duration: event.duration,
          location: event.location,
          points: event.points,
        }),
      });

      if (updateResponse.ok) {
        // Refresh event data
        await fetchEventData();
        alert("Combined Team Event started successfully!");
      } else {
        console.error("Failed to update event status");
        alert("Failed to start event. Please try again.");
      }
    } catch (error) {
      console.error("Error starting combined team event:", error);
      alert("An error occurred while starting the event. Please try again.");
    }
  };

  const handleCombinedTeamMatchComplete = async (
    winner: string,
    score: [number, number]
  ) => {
    try {
      if (!event) return;

      // First, get the current combined teams data to determine final standings
      const combinedTeamsResponse = await fetch(
        `/api/combined-team?eventId=${event.id}`
      );
      if (!combinedTeamsResponse.ok) {
        throw new Error("Failed to fetch combined teams data");
      }

      const combinedTeamsData = await combinedTeamsResponse.json();
      if (
        !combinedTeamsData.combinedTeams ||
        !combinedTeamsData.combinedTeams.teams
      ) {
        throw new Error("No combined teams data found");
      }

      // Determine final standings based on winner
      // winner === "team1" means combinedTeams.team1 won (1st place)
      // winner === "team2" means combinedTeams.team2 won (1st place)
      const winningCombinedTeam =
        winner === "team1"
          ? combinedTeamsData.combinedTeams.teams.team1
          : combinedTeamsData.combinedTeams.teams.team2;
      const losingCombinedTeam =
        winner === "team1"
          ? combinedTeamsData.combinedTeams.teams.team2
          : combinedTeamsData.combinedTeams.teams.team1;

      // Create final standings array with team IDs in order of finish
      // 1st place: winning combined team members
      // 2nd place: losing combined team members
      const finalStandings = [
        ...winningCombinedTeam.map((team: Team) => team.id),
        ...losingCombinedTeam.map((team: Team) => team.id),
      ];

      // Update event status to COMPLETED with final standings
      const updateResponse = await fetch(`/api/admin/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: event.name,
          abbreviation: event.abbreviation,
          symbol: event.symbol,
          eventType: event.eventType,
          status: "COMPLETED",
          startTime: event.startTime,
          duration: event.duration,
          location: event.location,
          points: event.points,
          finalStandings: finalStandings,
        }),
      });

      if (updateResponse.ok) {
        // Refresh event data
        await fetchEventData();
        alert("Combined Team Event completed successfully!");
      } else {
        console.error("Failed to update event status");
        alert("Failed to complete event. Please try again.");
      }
    } catch (error) {
      console.error("Error completing combined team event:", error);
      alert("An error occurred while completing the event. Please try again.");
    }
  };

  const handleMatchUpdate = async (
    matchId: string,
    winnerId: string | null,
    score: [number, number],
    completed?: boolean
  ) => {
    try {
      const response = await fetch("/api/tournament/update-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          matchId,
          winnerId,
          score,
          completed,
        }),
      });

      if (response.ok) {
        // Refresh bracket data
        if (event) {
          await fetchTournamentBracket(event.id);
        }
      } else {
        console.error("Failed to update match");
      }
    } catch (error) {
      console.error("Error updating match:", error);
    }
  };

  const handleEditClick = () => {
    if (!event) return;

    setEditFormData({
      name: event.name,
      abbreviation: event.abbreviation,
      symbol: event.symbol,
      eventType: event.eventType,
      status: event.status,
      startTime: new Date(event.startTime).toISOString().slice(0, 16),
      duration: event.duration || 60,
      location: event.location,
      points: event.points || [10, 7, 4, 2],
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/admin/events/${event?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        // Refresh event data
        await fetchEventData();
        setShowEditModal(false);
      } else {
        console.error("Failed to update event");
      }
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
  };

  const handleResetEvent = async () => {
    try {
      if (!event) return;

      // Confirm the reset action
      if (
        !confirm(
          "Are you sure you want to reset this tournament? This will:\n\n" +
            "• Delete all tournament brackets and matches\n" +
            "• Reset event status to 'Upcoming'\n" +
            "• Clear all seeds and tournament data\n" +
            "• This action cannot be undone\n\n" +
            "Click OK to continue or Cancel to abort."
        )
      ) {
        return;
      }

      // First, delete the tournament bracket if it exists
      if (tournamentBracket) {
        const deleteResponse = await fetch(
          `/api/tournament/bracket/${event.id}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        if (!deleteResponse.ok) {
          console.error("Failed to delete tournament bracket");
          alert("Failed to delete tournament bracket. Please try again.");
          return;
        }
      }

      // Update event status to UPCOMING
      const updateResponse = await fetch(`/api/admin/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: event.name,
          abbreviation: event.abbreviation,
          symbol: event.symbol,
          eventType: event.eventType,
          status: "UPCOMING",
          startTime: event.startTime,
          duration: event.duration,
          location: event.location,
          points: event.points,
        }),
      });

      if (updateResponse.ok) {
        console.log("Event reset successfully");

        // Reset local state
        setConfirmedSeeds([]);
        setTournamentBracket(null);

        // Update local event status to avoid refetching
        if (event) {
          setEvent({
            ...event,
            status: "UPCOMING",
          });
        }

        // Close the edit modal
        setShowEditModal(false);

        // Show success message
        alert(
          "Tournament has been reset successfully! The event is now back to 'Upcoming' status."
        );
      } else {
        console.error("Failed to update event status");
        alert("Failed to reset event. Please try again.");
      }
    } catch (error) {
      console.error("Error resetting event:", error);
      alert("An error occurred while resetting the event. Please try again.");
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
                        : event.eventType === "COMBINED_TEAM"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {formatEventType(event.eventType)}
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

            {/* Admin Edit Button */}
            {isAdmin && (
              <button
                onClick={handleEditClick}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Event
              </button>
            )}
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

      {/* Tournament Section */}
      {event.eventType === "TOURNAMENT" && (
        <div className="space-y-6 mb-6 sm:mb-8">
          {/* Tournament Seeding - Show when event is UPCOMING and no bracket exists */}
          {event.status === "UPCOMING" && !tournamentBracket && (
            <TournamentSeeding
              eventId={event.id}
              teams={teams.map((team) => ({
                id: team.id,
                name: team.name,
                abbreviation: team.abbreviation,
                color: team.color,
                eloRating: team.averageRating,
              }))}
              onSeedsConfirmed={handleSeedsConfirmed}
              isAdmin={isAdmin}
              eventStatus={event.status}
              confirmedSeeds={confirmedSeeds}
              eventData={{
                name: event.name,
                abbreviation: event.abbreviation,
                symbol: event.symbol,
                eventType: event.eventType,
                startTime: event.startTime,
                duration: event.duration,
                location: event.location,
                points: event.points,
              }}
            />
          )}

          {/* Tournament Bracket - Show when event is IN_PROGRESS or COMPLETED, or when bracket exists in UPCOMING */}
          {(event.status === "IN_PROGRESS" ||
            event.status === "COMPLETED" ||
            (event.status === "UPCOMING" && tournamentBracket)) &&
            tournamentBracket && (
              <>
                <TournamentBracket
                  eventId={event.id}
                  teams={teams.map((team) => ({
                    id: team.id,
                    name: team.name,
                    abbreviation: team.abbreviation,
                    color: team.color,
                    seed: tournamentBracket.participants.find(
                      (p) => p.teamId === team.id
                    )?.seed,
                  }))}
                  matches={tournamentBracket.matches}
                  participants={tournamentBracket.participants}
                  isAdmin={isAdmin}
                  eventStatus={event.status}
                  onMatchUpdate={handleMatchUpdate}
                />
              </>
            )}

          {/* Status message when bracket exists but event is still UPCOMING */}
          {event.status === "UPCOMING" && tournamentBracket && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Tournament Bracket Ready
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      The tournament bracket has been generated but the event is
                      still in &quot;Upcoming&quot; status. Click &quot;Start
                      Tournament&quot; to begin the tournament.
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={() => handleStartTournament()}
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        Start Tournament
                      </button>
                      <button
                        onClick={handleResetTournament}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset Tournament
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {bracketLoading && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tournament bracket...</p>
            </div>
          )}
        </div>
      )}

      {/* Combined Team Section */}
      {event.eventType === "COMBINED_TEAM" && (
        <div className="space-y-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Combined Team Event
              </h2>
            </div>

            <div className="p-6">
              <CombinedTeamMatch
                eventId={event.id}
                teams={teams.map((team) => ({
                  id: team.id,
                  name: team.name,
                  abbreviation: team.abbreviation,
                  color: team.color,
                  averageRating: team.averageRating,
                  members: team.members,
                }))}
                isAdmin={isAdmin}
                eventStatus={event.status}
                onMatchComplete={handleCombinedTeamMatchComplete}
                onStartEvent={handleStartCombinedTeamEvent}
              />
            </div>
          </div>
        </div>
      )}

      {/* Team Rankings - Only show when event is UPCOMING */}
      {event.status === "UPCOMING" && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Preliminary Rankings
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {teams.length > 0 ? (
              teams.map((team) => (
                <div key={team.id} className="p-6">
                  {/* Team Header - Clickable */}
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
                    onClick={() => toggleTeamExpansion(team.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={`${team.name} logo`}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.abbreviation}
                        </div>
                      )}
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
                    </div>

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
                            <Link
                              href={`/players/${encodeURIComponent(
                                member.playerName
                              )}`}
                              className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {member.playerName}
                            </Link>
                            <div className="flex items-center space-x-4 sm:space-x-6">
                              {/* Global Rank */}
                              <div className="text-center">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900">
                                  #{member.globalRank || "N/A"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Overall Rank
                                </p>
                              </div>

                              {/* Rating */}
                              <div className="text-center">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900">
                                  {member.rating}
                                </p>
                                <p className="text-xs text-gray-500">Rating</p>
                              </div>

                              {/* 24h Trend */}
                              <div className="text-center">
                                <TrendIndicator trend={member.trend} />
                                <p className="text-xs text-gray-500">
                                  24h Trend
                                </p>
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
      )}

      {/* Edit Event Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Event
              </h3>
              <form onSubmit={handleEditSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          name: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      Abbreviation
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.abbreviation}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          abbreviation: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      Symbol
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.symbol}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          symbol: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      Event Type
                    </label>
                    <select
                      value={editFormData.eventType}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          eventType: e.target.value as
                            | "TOURNAMENT"
                            | "SCORED"
                            | "COMBINED_TEAM",
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="TOURNAMENT">Tournament</option>
                      <option value="SCORED">Scored</option>
                      <option value="COMBINED_TEAM">Combined Team</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          status: e.target.value as
                            | "UPCOMING"
                            | "IN_PROGRESS"
                            | "COMPLETED",
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="UPCOMING">Upcoming</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={editFormData.startTime}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          startTime: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.duration}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          duration: parseInt(e.target.value) || 60,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      Location
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.location}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          location: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      Points Structure
                    </label>
                    <div className="space-y-2">
                      {editFormData.points.map((point, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <span className="text-sm font-medium text-gray-800 w-8">
                            {index + 1}
                            {getOrdinalSuffix(index + 1)}:
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={point}
                            onChange={(e) => {
                              const newPoints = [...editFormData.points];
                              newPoints[index] = parseInt(e.target.value) || 0;
                              setEditFormData({
                                ...editFormData,
                                points: newPoints,
                              });
                            }}
                            className="flex-1 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-6">
                  {/* Reset Event Button - Only show for tournament events */}
                  {editFormData.eventType === "TOURNAMENT" && (
                    <div className="flex flex-col space-y-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleResetEvent}
                        className="w-full sm:w-auto px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <RefreshCw className="w-4 h-4 mr-2 inline" />
                        Reset Tournament
                      </button>
                      <p className="text-xs text-red-600">
                        ⚠️ This will delete all tournament data and reset to
                        &quot;Upcoming&quot; status
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Update Event
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
