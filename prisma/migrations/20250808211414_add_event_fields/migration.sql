/*
  Warnings:

  - Added the required column `abbreviation` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventType` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `symbol` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('TOURNAMENT', 'SCORED');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "abbreviation" TEXT NOT NULL,
ADD COLUMN     "eventType" "public"."EventType" NOT NULL,
ADD COLUMN     "finalStandings" JSONB,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "points" INTEGER[],
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "public"."EventStatus" NOT NULL DEFAULT 'UPCOMING',
ADD COLUMN     "symbol" TEXT NOT NULL;
