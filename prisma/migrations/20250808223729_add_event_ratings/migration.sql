-- AlterTable
ALTER TABLE "public"."elo_history" ADD COLUMN     "eventId" TEXT;

-- AlterTable
ALTER TABLE "public"."votes" ADD COLUMN     "eventId" TEXT;

-- CreateTable
CREATE TABLE "public"."event_ratings" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5000,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_ratings_playerId_eventId_key" ON "public"."event_ratings"("playerId", "eventId");

-- AddForeignKey
ALTER TABLE "public"."elo_history" ADD CONSTRAINT "elo_history_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."votes" ADD CONSTRAINT "votes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_ratings" ADD CONSTRAINT "event_ratings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_ratings" ADD CONSTRAINT "event_ratings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
