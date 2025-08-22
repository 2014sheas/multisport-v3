"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Users,
  Calendar,
  Settings,
  User,
  Trophy,
  Home,
} from "lucide-react";

export default function AdminContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin?error=unauthorized");
      return;
    }

    if (!session.user?.isAdmin) {
      router.push("/auth/signin?error=unauthorized");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || !session.user?.isAdmin) {
    return null; // Will redirect via useEffect
  }

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Users", href: "/admin/users", icon: User },
    { name: "Players", href: "/admin/players", icon: Users },
    { name: "Teams", href: "/admin/teams", icon: Trophy },
    { name: "Events", href: "/admin/events", icon: Calendar },
    { name: "Schedule", href: "/admin/schedule", icon: Calendar },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white">
            <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Admin Menu
              </h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-blue-100 text-blue-900 border-r-2 border-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Top navigation bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="lg:hidden -m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Logo/Title */}
              <div className="flex-shrink-0 flex items-center ml-4 lg:ml-0">
                <h1 className="text-xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
              </div>
            </div>

            {/* Desktop navigation */}
            <div className="hidden lg:flex lg:items-center lg:space-x-8">
              {navigation.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    {item.name}
                  </a>
                );
              })}
            </div>

            {/* User info */}
            <div className="flex items-center">
              <div className="hidden sm:flex items-center text-sm text-gray-500">
                <span>Welcome, {session.user.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile breadcrumb */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <a
                href="/admin"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Admin
              </a>
            </li>
            {currentPath !== "/admin" && (
              <>
                <li className="text-gray-400">/</li>
                <li className="text-sm text-gray-500">
                  {navigation.find((item) => item.href === currentPath)?.name ||
                    "Page"}
                </li>
              </>
            )}
          </ol>
        </nav>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
