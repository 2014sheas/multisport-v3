"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Trophy,
  Calendar,
  Settings,
  User,
  Home,
  ArrowRight,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalPlayers: number;
  totalTeams: number;
  totalEvents: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPlayers: 0,
    totalTeams: 0,
    totalEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersResponse, playersResponse, teamsResponse, eventsResponse] =
        await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/players"),
          fetch("/api/admin/teams"),
          fetch("/api/admin/events"),
        ]);

      const usersData = await usersResponse.json();
      const playersData = await playersResponse.json();
      const teamsData = await teamsResponse.json();
      const eventsData = await eventsResponse.json();

      setStats({
        totalUsers: usersData.users?.length || 0,
        totalPlayers: playersData.players?.length || 0,
        totalTeams: teamsData.data?.teams?.length || 0,
        totalEvents: eventsData.events?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      name: "Manage Users",
      description: "View and manage user accounts",
      href: "/admin/users",
      icon: User,
      color: "bg-blue-500",
    },
    {
      name: "Manage Players",
      description: "Create and edit player profiles",
      href: "/admin/players",
      icon: Users,
      color: "bg-green-500",
    },
    {
      name: "Manage Teams",
      description: "Create teams and assign players",
      href: "/admin/teams",
      icon: Trophy,
      color: "bg-purple-500",
    },
    {
      name: "Manage Events",
      description: "Create and schedule events",
      href: "/admin/events",
      icon: Calendar,
      color: "bg-orange-500",
    },
    {
      name: "Schedule Management",
      description: "Manage event schedules and matches",
      href: "/admin/schedule",
      icon: Calendar,
      color: "bg-indigo-500",
    },
    {
      name: "Manage Years",
      description: "Manage years and historical data",
      href: "/admin/years",
      icon: Calendar,
      color: "bg-red-500",
    },
    {
      name: "View History",
      description: "View previous years' results and statistics",
      href: "/admin/history",
      icon: Calendar,
      color: "bg-emerald-500",
    },
    {
      name: "System Settings",
      description: "Configure system preferences",
      href: "/admin/settings",
      icon: Settings,
      color: "bg-gray-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Home className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <p className="text-lg text-gray-600">
          Welcome to the admin panel. Manage your multisport platform from here.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalUsers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Players</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalPlayers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalTeams}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalEvents}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <a
              key={action.name}
              href={action.href}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div
                    className={`p-3 rounded-lg ${action.color} bg-opacity-10`}
                  >
                    <action.icon
                      className={`w-6 h-6 ${action.color.replace(
                        "bg-",
                        "text-"
                      )}`}
                    />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                      {action.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Activity or Tips */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Getting Started
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Setup Checklist
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-3 ${
                    stats.totalUsers > 0 ? "bg-green-500" : "bg-gray-300"
                  }`}
                ></div>
                Create user accounts
              </li>
              <li className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-3 ${
                    stats.totalPlayers > 0 ? "bg-green-500" : "bg-gray-300"
                  }`}
                ></div>
                Add player profiles
              </li>
              <li className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-3 ${
                    stats.totalTeams > 0 ? "bg-green-500" : "bg-gray-300"
                  }`}
                ></div>
                Create teams
              </li>
              <li className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-3 ${
                    stats.totalEvents > 0 ? "bg-green-500" : "bg-gray-300"
                  }`}
                ></div>
                Schedule events
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Quick Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Players can be assigned to teams after both are created</li>
              <li>• Events can be scheduled once teams are set up</li>
              <li>• Use the schedule management to organize matches</li>
              <li>• Monitor player ratings and team performance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
