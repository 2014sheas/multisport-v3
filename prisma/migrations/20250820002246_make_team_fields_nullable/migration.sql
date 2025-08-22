-- AlterTable
ALTER TABLE "public"."tournament_matches" ALTER COLUMN "team1Id" DROP NOT NULL,
ALTER COLUMN "team2Id" DROP NOT NULL;
