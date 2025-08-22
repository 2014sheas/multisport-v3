-- AlterTable
ALTER TABLE "public"."players" ADD COLUMN     "experience" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wins" INTEGER NOT NULL DEFAULT 0;
