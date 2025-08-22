-- DropForeignKey
ALTER TABLE "public"."teams" DROP CONSTRAINT "teams_captainId_fkey";

-- AlterTable
ALTER TABLE "public"."teams" ALTER COLUMN "captainId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
