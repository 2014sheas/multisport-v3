const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function addTestPlayers() {
  const testPlayers = [
    { name: "John Smith", eloRating: 1200, experience: 3, wins: 1 },
    { name: "Sarah Johnson", eloRating: 1250, experience: 5, wins: 2 },
    { name: "Mike Davis", eloRating: 1180, experience: 2, wins: 0 },
    { name: "Emily Wilson", eloRating: 1320, experience: 7, wins: 3 },
    { name: "David Brown", eloRating: 1150, experience: 1, wins: 0 },
    { name: "Lisa Garcia", eloRating: 1280, experience: 4, wins: 1 },
    { name: "Tom Martinez", eloRating: 1220, experience: 3, wins: 1 },
    { name: "Jennifer Lee", eloRating: 1350, experience: 6, wins: 2 },
  ];

  try {
    console.log("Adding test players...");

    for (const player of testPlayers) {
      await prisma.player.create({
        data: {
          name: player.name,
          eloRating: player.eloRating,
          experience: player.experience,
          wins: player.wins,
        },
      });
      console.log(`Added player: ${player.name}`);
    }

    console.log("All test players added successfully!");
  } catch (error) {
    console.error("Error adding test players:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestPlayers();
