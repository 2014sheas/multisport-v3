import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    console.log("🔧 Development mode detected - creating sample data...");

    // Create 28 Olympic-style athletes
    const players = [
      // Team 1: Red Dragons (Basketball & Volleyball specialists)
      { name: "Marcus Johnson", eloRating: 5200, experience: 8, wins: 45 },
      { name: "Sarah Chen", eloRating: 5150, experience: 7, wins: 42 },
      { name: "David Rodriguez", eloRating: 5100, experience: 6, wins: 38 },
      { name: "Emily Watson", eloRating: 5080, experience: 5, wins: 35 },
      { name: "James Wilson", eloRating: 5050, experience: 4, wins: 32 },
      { name: "Lisa Thompson", eloRating: 5020, experience: 3, wins: 28 },
      { name: "Michael Brown", eloRating: 5000, experience: 2, wins: 25 },

      // Team 2: Blue Sharks (Swimming specialists)
      { name: "Alexandra Park", eloRating: 5250, experience: 9, wins: 52 },
      { name: "Ryan Mitchell", eloRating: 5180, experience: 7, wins: 41 },
      { name: "Sophia Lee", eloRating: 5120, experience: 6, wins: 37 },
      { name: "Connor Davis", eloRating: 5060, experience: 5, wins: 33 },
      { name: "Isabella Garcia", eloRating: 5010, experience: 4, wins: 29 },
      { name: "Tyler Anderson", eloRating: 4980, experience: 3, wins: 26 },
      { name: "Maya Patel", eloRating: 4950, experience: 2, wins: 22 },

      // Team 3: Green Eagles (Track & Field specialists)
      { name: "Jordan Taylor", eloRating: 5300, experience: 10, wins: 58 },
      { name: "Aisha Williams", eloRating: 5220, experience: 8, wins: 47 },
      { name: "Brandon Kim", eloRating: 5160, experience: 7, wins: 43 },
      { name: "Chloe Martinez", eloRating: 5090, experience: 6, wins: 39 },
      { name: "Ethan Clark", eloRating: 5030, experience: 5, wins: 34 },
      { name: "Natalie White", eloRating: 4970, experience: 4, wins: 30 },
      { name: "Kevin O'Connor", eloRating: 4920, experience: 3, wins: 27 },

      // Team 4: Gold Lions (Tennis & Gymnastics specialists)
      { name: "Emma Rodriguez", eloRating: 5280, experience: 9, wins: 51 },
      { name: "Lucas Wang", eloRating: 5200, experience: 8, wins: 46 },
      { name: "Zoe Hernandez", eloRating: 5140, experience: 7, wins: 40 },
      { name: "Nathan Foster", eloRating: 5070, experience: 6, wins: 36 },
      { name: "Grace Kim", eloRating: 5000, experience: 5, wins: 31 },
      { name: "Daniel Lewis", eloRating: 4940, experience: 4, wins: 28 },
      { name: "Rachel Green", eloRating: 4890, experience: 3, wins: 24 },
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

    // Create sample events for Olympic-style multisport tournament
    const olympicEvents = [
      {
        name: "Basketball - Men's Tournament",
        abbreviation: "BKM",
        symbol: "🏀",
        eventType: "TOURNAMENT" as const,
        status: "COMPLETED" as const,
        startTime: new Date("2024-08-20T09:00:00Z"),
        duration: 120,
        location: "Basketball Arena",
        points: [100, 75, 50, 25],
        finalStandings: undefined, // Will be set after teams are created
      },
      {
        name: "Basketball - Women's Tournament",
        abbreviation: "BKW",
        symbol: "🏀",
        eventType: "TOURNAMENT" as const,
        status: "COMPLETED" as const,
        startTime: new Date("2024-08-20T14:00:00Z"),
        duration: 120,
        location: "Basketball Arena",
        points: [100, 75, 50, 25],
        finalStandings: undefined, // Will be set after teams are created
      },
      {
        name: "Tennis - Men's Singles",
        abbreviation: "TMS",
        symbol: "🎾",
        eventType: "TOURNAMENT" as const,
        status: "COMPLETED" as const,
        startTime: new Date("2024-08-21T10:00:00Z"),
        duration: 90,
        location: "Tennis Center",
        points: [100, 75, 50, 25],
        finalStandings: undefined, // Will be set after teams are created
      },
      {
        name: "Tennis - Women's Singles",
        abbreviation: "TWS",
        symbol: "🎾",
        eventType: "TOURNAMENT" as const,
        status: "COMPLETED" as const,
        startTime: new Date("2024-08-21T15:00:00Z"),
        duration: 90,
        location: "Tennis Center",
        points: [100, 75, 50, 25],
        finalStandings: undefined, // Will be set after teams are created
      },
      {
        name: "Swimming - 100m Freestyle",
        abbreviation: "S1F",
        symbol: "🏊‍♂️",
        eventType: "SCORED" as const,
        status: "COMPLETED" as const,
        startTime: new Date("2024-08-22T09:00:00Z"),
        duration: 30,
        location: "Aquatic Center",
        points: [100, 75, 50, 25],
        finalStandings: undefined, // Will be set after teams are created
      },
      {
        name: "Swimming - 200m Breaststroke",
        abbreviation: "S2B",
        symbol: "🏊‍♂️",
        eventType: "SCORED" as const,
        status: "COMPLETED" as const,
        startTime: new Date("2024-08-22T10:00:00Z"),
        duration: 30,
        location: "Aquatic Center",
        points: [100, 75, 50, 25],
        finalStandings: undefined, // Will be set after teams are created
      },
      {
        name: "Track & Field - 100m Sprint",
        abbreviation: "T1S",
        symbol: "🏃‍♂️",
        eventType: "SCORED" as const,
        status: "IN_PROGRESS" as const,
        startTime: new Date("2024-08-23T14:00:00Z"),
        duration: 20,
        location: "Olympic Stadium",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Track & Field - Long Jump",
        abbreviation: "TLJ",
        symbol: "🏃‍♂️",
        eventType: "SCORED" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-23T16:00:00Z"),
        duration: 60,
        location: "Olympic Stadium",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Volleyball - Men's Tournament",
        abbreviation: "VLM",
        symbol: "🏐",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-24T09:00:00Z"),
        duration: 120,
        location: "Volleyball Arena",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Volleyball - Women's Tournament",
        abbreviation: "VLW",
        symbol: "🏐",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-24T14:00:00Z"),
        duration: 120,
        location: "Volleyball Arena",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Soccer - Men's Tournament",
        abbreviation: "SCM",
        symbol: "⚽",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-25T09:00:00Z"),
        duration: 90,
        location: "Soccer Stadium",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Soccer - Women's Tournament",
        abbreviation: "SCW",
        symbol: "⚽",
        eventType: "TOURNAMENT" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-25T14:00:00Z"),
        duration: 90,
        location: "Soccer Stadium",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Gymnastics - All-Around",
        abbreviation: "GAA",
        symbol: "🤸‍♀️",
        eventType: "SCORED" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-26T09:00:00Z"),
        duration: 180,
        location: "Gymnastics Arena",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Gymnastics - Floor Exercise",
        abbreviation: "GFE",
        symbol: "🤸‍♀️",
        eventType: "SCORED" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-26T14:00:00Z"),
        duration: 60,
        location: "Gymnastics Arena",
        points: [100, 75, 50, 25],
        finalStandings: undefined,
      },
      {
        name: "Closing Ceremony",
        abbreviation: "CC",
        symbol: "🎊",
        eventType: "SCORED" as const,
        status: "UPCOMING" as const,
        startTime: new Date("2024-08-26T18:00:00Z"),
        duration: 120,
        location: "Olympic Stadium",
        points: [0],
        finalStandings: undefined,
      },
    ];

    const createdEvents = [];
    for (const eventData of olympicEvents) {
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

    // Create 4 teams and assign players
    console.log("🏆 Creating teams and assigning players...");

    const teams = [
      {
        name: "Red Dragons",
        abbreviation: "RD",
        color: "#DC2626",
        captainId: createdPlayers[0].id, // Marcus Johnson
        players: createdPlayers.slice(0, 7), // First 7 players
      },
      {
        name: "Blue Sharks",
        abbreviation: "BS",
        color: "#2563EB",
        captainId: createdPlayers[7].id, // Alexandra Park
        players: createdPlayers.slice(7, 14), // Next 7 players
      },
      {
        name: "Green Eagles",
        abbreviation: "GE",
        color: "#16A34A",
        captainId: createdPlayers[14].id, // Jordan Taylor
        players: createdPlayers.slice(14, 21), // Next 7 players
      },
      {
        name: "Gold Lions",
        abbreviation: "GL",
        color: "#CA8A04",
        captainId: createdPlayers[21].id, // Emma Rodriguez
        players: createdPlayers.slice(21, 28), // Last 7 players
      },
    ];

    const createdTeams = [];
    for (const teamData of teams) {
      // Check if team already exists
      const existingTeam = await prisma.team.findFirst({
        where: { name: teamData.name },
      });

      let team;
      if (!existingTeam) {
        // Create team
        team = await prisma.team.create({
          data: {
            name: teamData.name,
            abbreviation: teamData.abbreviation,
            color: teamData.color,
            captainId: teamData.captainId,
            eloRating: 5000,
          },
        });
        console.log(
          `✅ Created team: ${teamData.name} (${teamData.abbreviation})`
        );
      } else {
        team = existingTeam;
        console.log(`⏭️  Team already exists: ${teamData.name}`);
      }

      createdTeams.push(team);

      // Add team members (check if they already exist)
      for (const player of teamData.players) {
        const existingMember = await prisma.teamMember.findFirst({
          where: {
            teamId: team.id,
            playerId: player.id,
          },
        });

        if (!existingMember) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              playerId: player.id,
            },
          });
          console.log(`✅ Added ${player.name} to ${teamData.name}`);
        } else {
          console.log(`⏭️  ${player.name} already on ${teamData.name}`);
        }
      }
    }

    // Set final standings for completed events
    console.log("🏆 Setting final standings for completed events...");

    // Basketball Men's Tournament - Red Dragons win, Blue Sharks 2nd, Green Eagles 3rd, Gold Lions 4th
    const basketballMenEvent = createdEvents.find(
      (e) => e.abbreviation === "BKM"
    );
    if (basketballMenEvent) {
      await prisma.event.update({
        where: { id: basketballMenEvent.id },
        data: {
          finalStandings: [
            createdTeams[0].id, // Red Dragons - 1st (100 pts)
            createdTeams[1].id, // Blue Sharks - 2nd (75 pts)
            createdTeams[2].id, // Green Eagles - 3rd (50 pts)
            createdTeams[3].id, // Gold Lions - 4th (25 pts)
          ],
        },
      });
      console.log("✅ Set final standings for Basketball Men's Tournament");
    }

    // Basketball Women's Tournament - Blue Sharks win, Green Eagles 2nd, Gold Lions 3rd, Red Dragons 4th
    const basketballWomenEvent = createdEvents.find(
      (e) => e.abbreviation === "BKW"
    );
    if (basketballWomenEvent) {
      await prisma.event.update({
        where: { id: basketballWomenEvent.id },
        data: {
          finalStandings: [
            createdTeams[1].id, // Blue Sharks - 1st (100 pts)
            createdTeams[2].id, // Green Eagles - 2nd (75 pts)
            createdTeams[3].id, // Gold Lions - 3rd (50 pts)
            createdTeams[0].id, // Red Dragons - 4th (25 pts)
          ],
        },
      });
      console.log("✅ Set final standings for Basketball Women's Tournament");
    }

    // Tennis Men's Singles - Green Eagles win, Gold Lions 2nd, Red Dragons 3rd, Blue Sharks 4th
    const tennisMenEvent = createdEvents.find((e) => e.abbreviation === "TMS");
    if (tennisMenEvent) {
      await prisma.event.update({
        where: { id: tennisMenEvent.id },
        data: {
          finalStandings: [
            createdTeams[2].id, // Green Eagles - 1st (100 pts)
            createdTeams[3].id, // Gold Lions - 2nd (75 pts)
            createdTeams[0].id, // Red Dragons - 3rd (50 pts)
            createdTeams[1].id, // Blue Sharks - 4th (25 pts)
          ],
        },
      });
      console.log("✅ Set final standings for Tennis Men's Singles");
    }

    // Tennis Women's Singles - Gold Lions win, Red Dragons 2nd, Blue Sharks 3rd, Green Eagles 4th
    const tennisWomenEvent = createdEvents.find(
      (e) => e.abbreviation === "TWS"
    );
    if (tennisWomenEvent) {
      await prisma.event.update({
        where: { id: tennisWomenEvent.id },
        data: {
          finalStandings: [
            createdTeams[3].id, // Gold Lions - 1st (100 pts)
            createdTeams[0].id, // Red Dragons - 2nd (75 pts)
            createdTeams[1].id, // Blue Sharks - 3rd (50 pts)
            createdTeams[2].id, // Green Eagles - 4th (25 pts)
          ],
        },
      });
      console.log("✅ Set final standings for Tennis Women's Singles");
    }

    // Swimming 100m Freestyle - Blue Sharks win, Green Eagles 2nd, Red Dragons 3rd, Gold Lions 4th
    const swimming100mEvent = createdEvents.find(
      (e) => e.abbreviation === "S1F"
    );
    if (swimming100mEvent) {
      await prisma.event.update({
        where: { id: swimming100mEvent.id },
        data: {
          finalStandings: [
            createdTeams[1].id, // Blue Sharks - 1st (100 pts)
            createdTeams[2].id, // Green Eagles - 2nd (75 pts)
            createdTeams[0].id, // Red Dragons - 3rd (50 pts)
            createdTeams[3].id, // Gold Lions - 4th (25 pts)
          ],
        },
      });
      console.log("✅ Set final standings for Swimming 100m Freestyle");
    }

    // Swimming 200m Breaststroke - Green Eagles win, Blue Sharks 2nd, Gold Lions 3rd, Red Dragons 4th
    const swimming200mEvent = createdEvents.find(
      (e) => e.abbreviation === "S2B"
    );
    if (swimming200mEvent) {
      await prisma.event.update({
        where: { id: swimming200mEvent.id },
        data: {
          finalStandings: [
            createdTeams[2].id, // Green Eagles - 1st (100 pts)
            createdTeams[1].id, // Blue Sharks - 2nd (75 pts)
            createdTeams[3].id, // Gold Lions - 3rd (50 pts)
            createdTeams[0].id, // Red Dragons - 4th (25 pts)
          ],
        },
      });
      console.log("✅ Set final standings for Swimming 200m Breaststroke");
    }

    // Create realistic event ratings based on team specializations
    console.log("🏆 Creating realistic event ratings for all players...");

    // Helper function to calculate realistic ratings
    const calculateEventRating = (player: any, event: any) => {
      const playerIndex = createdPlayers.findIndex((p) => p.id === player.id);
      const baseRating = player.eloRating;

      // Determine team and specialization
      let teamSpecialty = "";
      let specialtyBonus = 0;

      if (playerIndex >= 0 && playerIndex <= 6) {
        // Red Dragons - Basketball & Volleyball specialists
        teamSpecialty = "basketball_volleyball";
        if (
          event.abbreviation.includes("BK") ||
          event.abbreviation.includes("VL")
        ) {
          specialtyBonus = 200 + (Math.random() * 200 - 100); // +100 to +300
        } else if (event.abbreviation.includes("S")) {
          specialtyBonus = -150 + (Math.random() * 100 - 50); // -200 to -100
        } else {
          specialtyBonus = Math.random() * 200 - 100; // -100 to +100
        }
      } else if (playerIndex >= 7 && playerIndex <= 13) {
        // Blue Sharks - Swimming specialists
        teamSpecialty = "swimming";
        if (event.abbreviation.includes("S")) {
          specialtyBonus = 250 + (Math.random() * 200 - 100); // +150 to +350
        } else if (event.abbreviation.includes("T")) {
          specialtyBonus = 50 + (Math.random() * 100 - 50); // 0 to +100
        } else {
          specialtyBonus = Math.random() * 200 - 100; // -100 to +100
        }
      } else if (playerIndex >= 14 && playerIndex <= 20) {
        // Green Eagles - Track & Field specialists
        teamSpecialty = "track_field";
        if (event.abbreviation.includes("T")) {
          specialtyBonus = 200 + (Math.random() * 200 - 100); // +100 to +300
        } else if (
          event.abbreviation.includes("GA") ||
          event.abbreviation.includes("GF")
        ) {
          specialtyBonus = 50 + (Math.random() * 100 - 50); // 0 to +100
        } else {
          specialtyBonus = Math.random() * 200 - 100; // -100 to +100
        }
      } else {
        // Gold Lions - Tennis & Gymnastics specialists
        teamSpecialty = "tennis_gymnastics";
        if (
          event.abbreviation.includes("TM") ||
          event.abbreviation.includes("TW") ||
          event.abbreviation.includes("GA") ||
          event.abbreviation.includes("GF")
        ) {
          specialtyBonus = 200 + (Math.random() * 200 - 100); // +100 to +300
        } else if (event.abbreviation.includes("S")) {
          specialtyBonus = -100 + (Math.random() * 100 - 50); // -150 to -50
        } else {
          specialtyBonus = Math.random() * 200 - 100; // -100 to +100
        }
      }

      // Add some individual variation based on player experience and skill
      const experienceBonus = (player.experience - 5) * 10; // -30 to +50
      const skillVariation = Math.random() * 100 - 50; // -50 to +50

      const finalRating = Math.round(
        baseRating + specialtyBonus + experienceBonus + skillVariation
      );

      // Ensure ratings stay within reasonable bounds (3000-7000)
      return Math.max(3000, Math.min(7000, finalRating));
    };

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
          const rating = calculateEventRating(player, event);
          await prisma.eventRating.create({
            data: {
              playerId: player.id,
              eventId: event.id,
              rating: rating,
            },
          });
          console.log(
            `✅ Created event rating: ${player.name} -> ${event.name} (${rating})`
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
