/**
 * ELO Rating Utilities
 * Functions for calculating win probabilities and expected outcomes
 * without modifying actual ratings
 */

/**
 * Calculate the expected score (win probability) for a player/team
 * @param playerRating - The rating of the player/team
 * @param opponentRating - The rating of the opponent
 * @returns Expected score between 0 and 1 (0 = certain loss, 1 = certain win)
 */
export function calculateExpectedScore(
  playerRating: number,
  opponentRating: number
): number {
  const RATING_SCALE = 400; // Standard ELO scale factor

  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / RATING_SCALE));
}

/**
 * Calculate win probability for team1 against team2
 * @param team1Rating - Average ELO rating of team1
 * @param team2Rating - Average ELO rating of team2
 * @returns Win probability for team1 (0-1)
 */
export function calculateWinProbability(
  team1Rating: number,
  team2Rating: number
): number {
  return calculateExpectedScore(team1Rating, team2Rating);
}

/**
 * Calculate win probability percentage for display
 * @param team1Rating - Average ELO rating of team1
 * @param team2Rating - Average ELO rating of team2
 * @returns Win probability percentage for team1 (0-100)
 */
export function calculateWinProbabilityPercentage(
  team1Rating: number,
  team2Rating: number
): number {
  const probability = calculateWinProbability(team1Rating, team2Rating);
  return Math.round(probability * 100);
}

/**
 * Get win probability for both teams
 * @param team1Rating - Average ELO rating of team1
 * @param team2Rating - Average ELO rating of team2
 * @returns Object with win probabilities for both teams
 */
export function getBothTeamWinProbabilities(
  team1Rating: number,
  team2Rating: number
) {
  const team1WinProb = calculateWinProbability(team1Rating, team2Rating);
  const team2WinProb = 1 - team1WinProb;

  return {
    team1WinProbability: team1WinProb,
    team2WinProbability: team2WinProb,
    team1WinPercentage: Math.round(team1WinProb * 100),
    team2WinPercentage: Math.round(team2WinProb * 100),
  };
}

/**
 * Calculate team average ELO rating from member ratings
 * @param memberRatings - Array of individual player ELO ratings
 * @returns Average team rating
 */
export function calculateTeamAverageRating(memberRatings: number[]): number {
  if (memberRatings.length === 0) return 5000; // Default rating

  const totalRating = memberRatings.reduce((sum, rating) => sum + rating, 0);
  return Math.round(totalRating / memberRatings.length);
}
