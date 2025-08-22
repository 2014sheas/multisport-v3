-- DropForeignKey
ALTER TABLE "public"."teams" DROP CONSTRAINT "teams_captainId_fkey";

-- DropIndex
DROP INDEX "public"."teams_captainId_key";

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "public"."players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
