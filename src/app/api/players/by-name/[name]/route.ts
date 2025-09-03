import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { withFullValidation } from "@/lib/validation";
import { z } from "@/lib/validation/schemas";
import {
  PlayerService,
  UserService,
  TeamMembershipService,
  RatingService,
} from "@/lib/database";
import { NotFoundError } from "@/lib/errors";

export const GET = withErrorHandling(
  withFullValidation(
    {
      params: z.object({ name: z.string() }),
    },
    { path: "/api/players/by-name/[name]" }
  )(({ params }) => {
    const { name } = params!;
    const decodedName = decodeURIComponent(name);

    return getPlayerByName(decodedName);
  }),
  "/api/players/by-name/[name]"
);

async function getPlayerByName(name: string) {
  const playerService = new PlayerService();
  const userService = new UserService();
  const teamMembershipService = new TeamMembershipService();
  const ratingService = new RatingService();

  // Get player with basic data
  const player = await playerService.getPlayerByName(name);

  if (!player) {
    throw new NotFoundError("Player");
  }

  const playerData = player as any;

  // Get player's overall rating using centralized service
  const overallRating = ratingService.calculatePlayerAverageRating(playerData, {
    useEventRatings: true,
  });

  // Get global rank using optimized query
  const globalRank = await getPlayerGlobalRank(playerData.id);

  // Get profile picture using centralized service
  const playerWithProfile = await userService.getPlayerWithProfile(
    playerData.id
  );

  // Get team membership info using centralized service
  const teamMembershipInfo =
    await teamMembershipService.getPlayerTeamMembershipInfo(playerData.id);

  // Get captain status using centralized service
  const isCaptain = await teamMembershipService.isPlayerCaptain(playerData.id);

  // Format the response
  const formattedPlayer = {
    id: playerData.id,
    name: playerData.name,
    experience: playerData.experience || 0,
    wins: playerData.wins || 0,
    eloRating: overallRating,
    globalRank,
    profilePicture: playerWithProfile?.profilePicture || null,
    team:
      teamMembershipInfo.length > 0
        ? {
            id: teamMembershipInfo[0].teamId,
            name: teamMembershipInfo[0].teamName,
            color: teamMembershipInfo[0].teamColor,
            abbreviation: teamMembershipInfo[0].teamAbbreviation,
          }
        : null,
    isCaptain,
  };

  return { player: formattedPlayer };
}

async function getPlayerGlobalRank(playerId: string): Promise<number> {
  const ratingService = new RatingService();

  // Get all players with their overall ratings
  const playersWithRatings = await ratingService.getPlayersWithOverallRatings({
    includeTrend: false,
  });

  // Sort by rating and find rank
  const sortedPlayers = playersWithRatings.sort((a, b) => b.rating - a.rating);
  const rank = sortedPlayers.findIndex((p) => p.id === playerId) + 1;

  return rank;
}
