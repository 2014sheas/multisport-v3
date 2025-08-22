"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Camera, Save, AlertCircle } from "lucide-react";

interface Player {
  id: string;
  name: string;
  experience: number | null;
  wins: number | null;
  eloRating: number;
  gamesPlayed: number;
  profilePicture?: string | null;
}

interface ProfileFormData {
  experience: number | null;
  wins: number | null;
  profilePicture: File | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<ProfileFormData>({
    experience: null,
    wins: null,
    profilePicture: null,
  });

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchPlayerData();
  }, [session, status, router]);

  const fetchPlayerData = async () => {
    try {
      const response = await fetch(`/api/profile/player`);
      if (response.ok) {
        const data = await response.json();
        setPlayer(data.player);
        setFormData({
          experience: data.player?.experience || null,
          wins: data.player?.wins || null,
          profilePicture: null,
        });
      } else if (response.status === 404) {
        setError(
          "No player account linked to your user account. Please contact an admin to link your account to a player."
        );
      } else {
        setError("Failed to fetch player data");
      }
    } catch (error) {
      setError("Failed to fetch player data");
    } finally {
      setLoading(false);
    }
  };

  const handleExperienceChange = (value: string) => {
    const numValue = value === "" ? null : parseInt(value);
    setFormData((prev) => ({ ...prev, experience: numValue }));
  };

  const handleWinsChange = (value: string) => {
    const numValue = value === "" ? null : parseInt(value);
    setFormData((prev) => ({ ...prev, wins: numValue }));
  };

  const handleProfilePictureChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, profilePicture: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const formDataToSend = new FormData();
      if (formData.experience !== null) {
        formDataToSend.append("experience", formData.experience.toString());
      }
      if (formData.wins !== null) {
        formDataToSend.append("wins", formData.wins.toString());
      }
      if (formData.profilePicture) {
        formDataToSend.append("profilePicture", formData.profilePicture);
      }

      const response = await fetch("/api/profile/update", {
        method: "PUT",
        body: formDataToSend,
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("Profile updated successfully!");
        setPlayer(data.player);
        // Reset form data
        setFormData((prev) => ({ ...prev, profilePicture: null }));
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update profile");
      }
    } catch (error) {
      setError("Failed to update profile");
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

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">
                Profile Not Available
              </h1>
            </div>
            <p className="text-gray-800 mb-4">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Profile Settings
            </h1>
            <p className="text-gray-700">
              Update your player profile information
            </p>
          </div>

          {/* Profile Picture Section */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {player.profilePicture ? (
                    <img
                      src={player.profilePicture}
                      alt={player.name}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700">
                  <Camera className="h-4 w-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {player.name}
                </h3>
                <p className="text-gray-700">Elo Rating: {player.eloRating}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {/* Experience Field */}
            <div className="mb-6">
              <label
                htmlFor="experience"
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Years of Experience
              </label>
              <input
                type="number"
                id="experience"
                min="0"
                max="50"
                value={formData.experience || ""}
                onChange={(e) => handleExperienceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-600"
                placeholder="Enter years of experience"
              />
              <p className="mt-1 text-sm text-gray-700">
                How many years have you been a participant?
              </p>
            </div>

            {/* Wins Field */}
            <div className="mb-6">
              <label
                htmlFor="wins"
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Years Won
              </label>
              <input
                type="number"
                id="wins"
                min="0"
                max="50"
                value={formData.wins || ""}
                onChange={(e) => handleWinsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-600"
                placeholder="Enter years won"
              />
              <p className="mt-1 text-sm text-gray-700">
                How many years have you won the Multisport Games?
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
