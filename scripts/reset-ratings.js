const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function resetRatings() {
  try {
    console.log("Resetting all player ratings to 5000...");

    const result = await prisma.player.updateMany({
      data: {
        eloRating: 5000,
        gamesPlayed: 0,
        wins: 0,
      },
    });

    console.log(`Updated ${result.count} players to rating 5000`);

    // Clear all vote history and Elo history
    console.log("Clearing vote and Elo history...");

    await prisma.vote.deleteMany({});
    await prisma.eloHistory.deleteMany({});

    console.log("Successfully reset all ratings and cleared history!");
  } catch (error) {
    console.error("Error resetting ratings:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetRatings();
