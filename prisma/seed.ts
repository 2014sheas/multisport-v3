import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    console.log("🔧 Development mode detected - creating sample data...");

    // Create sample players
    const players = [
      { name: "John Doe", eloRating: 1200 },
      { name: "Jane Smith", eloRating: 1200 },
      { name: "Mike Johnson", eloRating: 1200 },
      { name: "Sarah Wilson", eloRating: 1200 },
      { name: "Tom Brown", eloRating: 1200 },
      { name: "Lisa Davis", eloRating: 1200 },
    ];

    for (const playerData of players) {
      const existingPlayer = await prisma.player.findFirst({
        where: { name: playerData.name },
      });

      if (!existingPlayer) {
        await prisma.player.create({
          data: playerData,
        });
        console.log(`✅ Created player: ${playerData.name}`);
      } else {
        console.log(`⏭️  Player already exists: ${playerData.name}`);
      }
    }

    // Create sample admin user if it doesn't exist
    const adminEmail = "admin@example.com";
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Admin User",
          password:
            "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQJ8Kj1G", // password: admin123
          isAdmin: true,
          emailVerified: true,
        },
      });
      console.log(
        "✅ Created admin user: admin@example.com (password: admin123)"
      );
    } else {
      console.log("⏭️  Admin user already exists");
    }

    // Create sample event
    const existingEvent = await prisma.event.findFirst({
      where: { name: "Sample Event" },
    });

    if (!existingEvent) {
      await prisma.event.create({
        data: {
          name: "Sample Event",
          abbreviation: "SE",
          symbol: "🏆",
          eventType: "TOURNAMENT",
          status: "UPCOMING",
          startTime: new Date("2024-12-01T10:00:00Z"),
          location: "Main Arena",
          points: [100, 75, 50, 25],
          finalStandings: undefined,
        },
      });
      console.log("✅ Created sample event");
    } else {
      console.log("⏭️  Sample event already exists");
    }
  } else {
    console.log("🚀 Production mode detected - skipping sample data creation");
  }

  console.log("✅ Database seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
