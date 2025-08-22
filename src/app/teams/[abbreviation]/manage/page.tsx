"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Upload, Users } from "lucide-react";
import Link from "next/link";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  logo?: string | null;
  captainId?: string | null;
}

export default function TeamManagePage({
  params,
}: {
  params: Promise<{ abbreviation: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [teamAbbreviation, setTeamAbbreviation] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    logo: null as File | null,
  });

  useEffect(() => {
    const getParams = async () => {
      const { abbreviation } = await params;
      setTeamAbbreviation(decodeURIComponent(abbreviation));
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (teamAbbreviation) {
      fetchTeamData();
    }
  }, [teamAbbreviation]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${teamAbbreviation}/manage`);

      if (response.ok) {
        const data = await response.json();
        setTeam(data.team);
        setFormData({
          name: data.team.name,
          abbreviation: data.team.abbreviation,
          logo: null,
        });
      } else if (response.status === 403) {
        setError("You don't have permission to manage this team");
        router.push(`/teams/${teamAbbreviation}`);
      } else if (response.status === 404) {
        setError("Team not found");
        router.push("/teams");
      } else {
        setError("Failed to fetch team data");
      }
    } catch (error) {
      setError("Failed to fetch team data");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({ ...prev, name: value }));
  };

  const handleAbbreviationChange = (value: string) => {
    // Only allow uppercase letters and numbers, max 4 characters
    const cleanValue = value
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 4);
    setFormData((prev) => ({ ...prev, abbreviation: cleanValue }));
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, logo: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("abbreviation", formData.abbreviation);
      if (formData.logo) {
        formDataToSend.append("logo", formData.logo);
      }

      const response = await fetch(`/api/teams/${teamAbbreviation}/manage`, {
        method: "PUT",
        body: formDataToSend,
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("Team updated successfully!");
        setTeam(data.team);
        setTeamAbbreviation(data.team.abbreviation);
        // Reset form data
        setFormData((prev) => ({ ...prev, logo: null }));
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update team");
      }
    } catch (error) {
      setError("Failed to update team");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">
                Team Not Available
              </h1>
            </div>
            <p className="text-gray-600 mb-4">
              {error || "Unable to load team data."}
            </p>
            <Link
              href="/teams"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Teams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Manage Team</h1>
            <Link
              href={`/teams/${teamAbbreviation}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Team
            </Link>
          </div>

          {/* Current Team Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center space-x-4">
              {team.logo ? (
                <img
                  src={team.logo}
                  alt={`${team.name} logo`}
                  className="h-16 w-16 rounded-lg object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {team.name}
                </h2>
                <p className="text-gray-600">
                  Abbreviation: {team.abbreviation}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: team.color }}
                  ></div>
                  <span className="text-sm text-gray-600">
                    Team Color: {team.color}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Team Management Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Edit Team Information
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Team Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-600"
                placeholder="Enter team name"
                required
              />
            </div>

            {/* Team Abbreviation */}
            <div>
              <label
                htmlFor="abbreviation"
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Team Abbreviation
              </label>
              <input
                type="text"
                id="abbreviation"
                value={formData.abbreviation}
                onChange={(e) => handleAbbreviationChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-600 font-mono"
                placeholder="e.g., ALPHA"
                maxLength={4}
                required
              />
              <p className="mt-1 text-sm text-gray-700">
                Must be 1-4 characters, letters and numbers only
              </p>
            </div>

            {/* Team Logo */}
            <div>
              <label
                htmlFor="logo"
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Team Logo
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {formData.logo ? (
                    <img
                      src={URL.createObjectURL(formData.logo)}
                      alt="Preview"
                      className="h-16 w-16 rounded-lg object-cover border-2 border-gray-200"
                    />
                  ) : team.logo ? (
                    <img
                      src={team.logo}
                      alt={`${team.name} logo`}
                      className="h-16 w-16 rounded-lg object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.logo ? "Change Logo" : "Upload Logo"}
                  </label>
                  {formData.logo && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, logo: null }))
                      }
                      className="ml-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-700">
                Upload a square image (PNG, JPG, GIF). Max size: 5MB
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Updating..." : "Update Team"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
