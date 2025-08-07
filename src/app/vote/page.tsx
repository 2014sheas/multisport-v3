"use client";

import { useState, useEffect } from "react";

interface Player {
  id: string;
  name: string;
  eloRating: number;
}

export default function VotingPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [voterSession] = useState(() =>
    Math.random().toString(36).substring(7)
  );

  const fetchRandomPlayers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/players/random");
      const data = await response.json();
      setPlayers(data.players);
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (winnerId: string, loserId: string) => {
    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voterSession,
          winnerId,
          loserId,
        }),
      });

      // Fetch new players after voting
      setTimeout(() => {
        fetchRandomPlayers();
      }, 300); // 0.3 second delay for fade transition
    } catch (error) {
      console.error("Error submitting vote:", error);
    }
  };

  useEffect(() => {
    fetchRandomPlayers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          No Players Available
        </h2>
        <p className="text-gray-600">
          Please add some players to start voting.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Keep-Trade-Cut
        </h1>
        <p className="text-gray-600">
          Vote on who you would keep, trade, or cut from these three players
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {players.map((player, index) => (
          <div
            key={player.id}
            className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-blue-300 transition-all duration-200"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {player.name}
              </h3>
              <p className="text-gray-600 mb-4">Elo: {player.eloRating}</p>

              <div className="space-y-2">
                <button
                  onClick={() =>
                    handleVote(player.id, players[(index + 1) % 3].id)
                  }
                  className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
                >
                  Keep
                </button>
                <button
                  onClick={() =>
                    handleVote(player.id, players[(index + 2) % 3].id)
                  }
                  className="w-full bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors"
                >
                  Trade
                </button>
                <button
                  onClick={() =>
                    handleVote(player.id, players[(index + 1) % 3].id)
                  }
                  className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
                >
                  Cut
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Vote as many times as you want to help establish accurate rankings!
        </p>
      </div>
    </div>
  );
}
