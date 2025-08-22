/*
  Warnings:

  - You are about to drop the column `loserId` on the `votes` table. All the data in the column will be lost.
  - You are about to drop the column `winnerId` on the `votes` table. All the data in the column will be lost.
  - Added the required column `cutId` to the `votes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `keepId` to the `votes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tradeId` to the `votes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."votes" DROP CONSTRAINT "votes_loserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."votes" DROP CONSTRAINT "votes_winnerId_fkey";

-- AlterTable
ALTER TABLE "public"."votes" DROP COLUMN "loserId",
DROP COLUMN "winnerId",
ADD COLUMN     "cutId" TEXT NOT NULL,
ADD COLUMN     "keepId" TEXT NOT NULL,
ADD COLUMN     "tradeId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."votes" ADD CONSTRAINT "votes_keepId_fkey" FOREIGN KEY ("keepId") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."votes" ADD CONSTRAINT "votes_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."votes" ADD CONSTRAINT "votes_cutId_fkey" FOREIGN KEY ("cutId") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
