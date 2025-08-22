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
      { name: "John Doe", eloRating: 5000 },
      { name: "Jane Smith", eloRating: 5000 },
      { name: "Mike Johnson", eloRating: 5000 },
      { name: "Sarah Wilson", eloRating: 5000 },
      { name: "Tom Brown", eloRating: 5000 },
      { name: "Lisa Davis", eloRating: 5000 },
    ];

    const createdPlayers = [];
    for (const playerData of players) {
      const existingPlayer = await prisma.player.findFirst({
        where: { name: playerData.name },
      });

      if (!existingPlayer) {
        const player = await prisma.player.create({
          data: playerData,
        });
        createdPlayers.push(player);
        console.log(`✅ Created player: ${playerData.name}`);
      } else {
        createdPlayers.push(existingPlayer);
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

    // Create sample events for August tournament
    const augustEvents = [
      {
        name: "Opening Ceremony",
        abbreviation: "OC",
        symbol: "🎉",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-22T09:00:00Z"),
        duration: 60,
        location: "Main Arena",
        points: [0],
        finalStandings: undefined,
      },
      {
        name: "Team Registration",
        abbreviation: "TR",
        symbol: "📝",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-22T10:00:00Z"),
        duration: 120,
        location: "Registration Desk",
        points: [0],
        finalStandings: undefined,
      },
      {
        name: "Round 1 - Group A",
        abbreviation: "R1A",
        symbol: "⚽",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-22T14:00:00Z"),
        duration: 90,
        location: "Field 1",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Round 1 - Group B",
        abbreviation: "R1B",
        symbol: "⚽",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-22T16:00:00Z"),
        duration: 90,
        location: "Field 2",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Round 2 - Group A",
        abbreviation: "R2A",
        symbol: "⚽",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-23T10:00:00Z"),
        duration: 90,
        location: "Field 1",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Round 2 - Group B",
        abbreviation: "R2B",
        symbol: "⚽",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-23T14:00:00Z"),
        duration: 90,
        location: "Field 2",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Semi-Finals",
        abbreviation: "SF",
        symbol: "🏆",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-24T10:00:00Z"),
        duration: 120,
        location: "Main Arena",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Championship Game",
        abbreviation: "CG",
        symbol: "🥇",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-24T15:00:00Z"),
        duration: 120,
        location: "Main Arena",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Awards Ceremony",
        abbreviation: "AC",
        symbol: "🏅",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-24T18:00:00Z"),
        duration: 60,
        location: "Main Arena",
        points: [0],
        finalStandings: undefined,
      },
    ];

    const createdEvents = [];
    for (const eventData of augustEvents) {
      const existingEvent = await prisma.event.findFirst({
        where: { name: eventData.name },
      });

      if (!existingEvent) {
        const event = await prisma.event.create({
          data: eventData,
        });
        createdEvents.push(event);
        console.log(`✅ Created event: ${eventData.name}`);
      } else {
        createdEvents.push(existingEvent);
        console.log(`⏭️  Event already exists: ${eventData.name}`);
      }
    }

    // Create event ratings for all players and events
    console.log("🏆 Creating event ratings for all players...");
    for (const player of createdPlayers) {
      for (const event of createdEvents) {
        // Check if event rating already exists
        const existingRating = await prisma.eventRating.findUnique({
          where: {
            playerId_eventId: {
              playerId: player.id,
              eventId: event.id,
            },
          },
        });

        if (!existingRating) {
          await prisma.eventRating.create({
            data: {
              playerId: player.id,
              eventId: event.id,
              rating: 5000,
            },
          });
          console.log(
            `✅ Created event rating: ${player.name} -> ${event.name} (5000)`
          );
        } else {
          console.log(
            `⏭️  Event rating already exists: ${player.name} -> ${event.name}`
          );
        }
      }
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
