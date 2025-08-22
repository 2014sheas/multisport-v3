-- AlterTable
ALTER TABLE "public"."tournament_matches" ADD COLUMN     "team1FromMatchId" TEXT,
ADD COLUMN     "team1IsWinner" BOOLEAN,
ADD COLUMN     "team2FromMatchId" TEXT,
ADD COLUMN     "team2IsWinner" BOOLEAN;

-- AddForeignKey
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_team1FromMatchId_fkey" FOREIGN KEY ("team1FromMatchId") REFERENCES "public"."tournament_matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_team2FromMatchId_fkey" FOREIGN KEY ("team2FromMatchId") REFERENCES "public"."tournament_matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
