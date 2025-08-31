"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import AdminGuard from "@/components/AdminGuard";

interface Year {
  id: string;
  year: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminYearsPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    description: "",
    isActive: false,
  });
  const [editFormData, setEditFormData] = useState({
    year: new Date().getFullYear(),
    description: "",
    isActive: false,
  });
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      const response = await fetch("/api/admin/years");
      const data = await response.json();
      setYears(data.years || []);
    } catch (error) {
      console.error("Error fetching years:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/years", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddForm(false);
        setFormData({
          year: new Date().getFullYear(),
          description: "",
          isActive: false,
        });
        setMessage("Year created successfully!");
        setTimeout(() => setMessage(""), 3000);
        fetchYears();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || "Failed to create year");
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error("Error adding year:", error);
      setMessage("Failed to create year");
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleUpdateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYear) return;

    try {
      const response = await fetch(`/api/admin/years/${editingYear.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        setEditingYear(null);
        setEditFormData({
          year: new Date().getFullYear(),
          description: "",
          isActive: false,
        });
        setMessage("Year updated successfully!");
        setTimeout(() => setMessage(""), 3000);
        fetchYears();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || "Failed to update year");
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error("Error updating year:", error);
      setMessage("Failed to update year");
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleEditClick = (year: Year) => {
    setEditingYear(year);
    setEditFormData({
      year: year.year,
      description: year.description || "",
      isActive: year.isActive,
    });
  };

  const handleDeleteYear = async (yearId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this year? This action cannot be undone."
      )
    )
      return;

    try {
      const response = await fetch(`/api/admin/years/${yearId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage("Year deleted successfully!");
        setTimeout(() => setMessage(""), 3000);
        fetchYears();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || "Failed to delete year");
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error("Error deleting year:", error);
      setMessage("Failed to delete year");
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleActivateYear = async (yearId: string) => {
    try {
      const response = await fetch(`/api/admin/years/${yearId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: true }),
      });

      if (response.ok) {
        setMessage("Year activated successfully!");
        setTimeout(() => setMessage(""), 3000);
        fetchYears();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || "Failed to activate year");
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error("Error activating year:", error);
      setMessage("Failed to activate year");
      setTimeout(() => setMessage(""), 5000);
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
    <AdminGuard>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Year Management</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Year
          </button>
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

        {/* Years List */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Available Years
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {years.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  No years created yet
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  Create your first year to get started with year-based
                  management.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Year
                </button>
              </div>
            ) : (
              years.map((year) => (
                <div key={year.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {year.year}
                        </span>
                        {year.isActive ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          {year.description || "No description"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created:{" "}
                          {new Date(year.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!year.isActive && (
                        <button
                          onClick={() => handleActivateYear(year.id)}
                          className="text-xs bg-green-100 text-green-700 px-3 py-2 rounded hover:bg-green-200"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleEditClick(year)}
                        className="text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      {!year.isActive && (
                        <button
                          onClick={() => handleDeleteYear(year.id)}
                          className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Year Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add New Year
                </h3>
                <form onSubmit={handleAddYear}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Year
                      </label>
                      <input
                        type="number"
                        required
                        min="2000"
                        max="2100"
                        value={formData.year}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            year: parseInt(e.target.value),
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="e.g., Previous year, Historical data"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="isActive"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Set as active year
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Add Year
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Year Modal */}
        {editingYear && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Edit Year
                </h3>
                <form onSubmit={handleUpdateYear}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Year
                      </label>
                      <input
                        type="number"
                        required
                        min="2000"
                        max="2100"
                        value={editFormData.year}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            year: parseInt(e.target.value),
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editFormData.description}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            description: e.target.value,
                          })
                        }
                        placeholder="e.g., Previous year, Historical data"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="editIsActive"
                        checked={editFormData.isActive}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            isActive: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="editIsActive"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Set as active year
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setEditingYear(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Update Year
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
