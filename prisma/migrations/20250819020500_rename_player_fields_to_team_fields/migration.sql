/*
  Warnings:

  - You are about to drop the column `player1Id` on the `tournament_matches` table. All the data in the column will be lost.
  - You are about to drop the column `player2Id` on the `tournament_matches` table. All the data in the column will be lost.
  - Added the required column `team1Id` to the `tournament_matches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team2Id` to the `tournament_matches` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT "tournament_matches_player1Id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT "tournament_matches_player2Id_fkey";

-- AlterTable
ALTER TABLE "public"."tournament_matches" DROP COLUMN "player1Id",
DROP COLUMN "player2Id",
ADD COLUMN     "team1Id" TEXT NOT NULL,
ADD COLUMN     "team2Id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "public"."tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "public"."tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
