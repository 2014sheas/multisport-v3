"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";

interface Player {
  id: string;
  name: string;
  eloRating: number;
  rank: number;
  eloHistory: Array<{
    oldRating: number;
    newRating: number;
    timestamp: string;
  }>;
}

export default function RankingsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      const response = await fetch("/api/rankings");
      const data = await response.json();
      setPlayers(data.players);
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  const SimpleChart = ({ history }: { history: Player["eloHistory"] }) => {
    if (history.length < 2)
      return <div className="text-gray-400 text-sm">No history</div>;

    const points = history.slice(-10); // Last 10 points
    const minRating = Math.min(...points.map((p) => p.newRating));
    const maxRating = Math.max(...points.map((p) => p.newRating));
    const range = maxRating - minRating || 1;

    return (
      <svg width="100" height="30" className="w-full h-8">
        <polyline
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          points={points
            .map(
              (point, i) =>
                `${(i / (points.length - 1)) * 100},${
                  30 - ((point.newRating - minRating) / range) * 30
                }`
            )
            .join(" ")}
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Player Rankings
        </h1>
        <p className="text-gray-600">
          Current Elo ratings and performance history
        </p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wide">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2">Elo Rating</div>
            <div className="col-span-5">Rating History</div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      index < 3
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {player.rank}
                  </span>
                </div>

                <div className="col-span-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-blue-600">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {player.name}
                    </span>
                  </div>
                </div>

                <div className="col-span-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {player.eloRating}
                  </span>
                </div>

                <div className="col-span-5">
                  <SimpleChart history={player.eloHistory} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Rankings are updated in real-time based on Keep-Trade-Cut votes
        </p>
      </div>
    </div>
  );
}
