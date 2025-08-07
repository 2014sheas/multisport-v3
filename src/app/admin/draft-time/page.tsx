"use client";

import { useState, useEffect } from "react";
import { Clock, Save } from "lucide-react";

export default function DraftTimePage() {
  const [draftTime, setDraftTime] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    fetchDraftTime();
  }, []);

  const fetchDraftTime = async () => {
    try {
      const response = await fetch("/api/draft-time");
      const data = await response.json();
      if (data.draftTime) {
        // Convert to local datetime-local format
        const date = new Date(data.draftTime);
        const localDateTime = date.toISOString().slice(0, 16);
        setDraftTime(localDateTime);
      }
    } catch (error) {
      console.error("Error fetching draft time:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draftTime) {
      setMessage("Please select a draft time");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/draft-time", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftTime: new Date(draftTime).toISOString(),
        }),
      });

      if (response.ok) {
        setMessage("Draft time updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to update draft time");
      }
    } catch (error) {
      console.error("Error updating draft time:", error);
      setMessage("Failed to update draft time");
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <Clock className="w-6 h-6 text-blue-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">
          Draft Time Settings
        </h1>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-6">
          <label
            htmlFor="draftTime"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Draft Start Time
          </label>
          <input
            type="datetime-local"
            id="draftTime"
            value={draftTime}
            onChange={(e) => setDraftTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-2 text-sm text-gray-600">
            Set when the draft will begin. This will be displayed as a countdown
            on the homepage.
          </p>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-md ${
              message.includes("successfully")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Draft Time"}
          </button>
        </div>
      </div>

      {/* Preview Section */}
      {draftTime && (
        <div className="mt-6 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview</h3>
          <p className="text-gray-600">
            Draft will start on:{" "}
            <span className="font-semibold">
              {new Date(draftTime).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
