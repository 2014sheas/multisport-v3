-- CreateEnum
CREATE TYPE "public"."TournamentStatus" AS ENUM ('SEEDING', 'BRACKET_GENERATED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."tournament_brackets" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "public"."TournamentStatus" NOT NULL DEFAULT 'SEEDING',
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tournament_participants" (
    "id" TEXT NOT NULL,
    "tournamentBracketId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seed" INTEGER,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,
    "eliminationRound" INTEGER,
    "finalPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tournament_matches" (
    "id" TEXT NOT NULL,
    "tournamentBracketId" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "isWinnersBracket" BOOLEAN NOT NULL,
    "winnerId" TEXT,
    "score" JSONB,
    "status" "public"."MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledTime" TIMESTAMP(3),
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_brackets_eventId_key" ON "public"."tournament_brackets"("eventId");

-- CreateIndex
CREATE INDEX "tournament_participants_tournamentBracketId_seed_idx" ON "public"."tournament_participants"("tournamentBracketId", "seed");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournamentBracketId_teamId_key" ON "public"."tournament_participants"("tournamentBracketId", "teamId");

-- CreateIndex
CREATE INDEX "tournament_matches_tournamentBracketId_round_idx" ON "public"."tournament_matches"("tournamentBracketId", "round");

-- CreateIndex
CREATE INDEX "tournament_matches_tournamentBracketId_isWinnersBracket_idx" ON "public"."tournament_matches"("tournamentBracketId", "isWinnersBracket");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_matches_tournamentBracketId_round_matchNumber_is_key" ON "public"."tournament_matches"("tournamentBracketId", "round", "matchNumber", "isWinnersBracket");

-- AddForeignKey
ALTER TABLE "public"."tournament_brackets" ADD CONSTRAINT "tournament_brackets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_brackets" ADD CONSTRAINT "tournament_brackets_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "public"."tournament_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_participants" ADD CONSTRAINT "tournament_participants_tournamentBracketId_fkey" FOREIGN KEY ("tournamentBracketId") REFERENCES "public"."tournament_brackets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_participants" ADD CONSTRAINT "tournament_participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_tournamentBracketId_fkey" FOREIGN KEY ("tournamentBracketId") REFERENCES "public"."tournament_brackets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "public"."tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "public"."tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
