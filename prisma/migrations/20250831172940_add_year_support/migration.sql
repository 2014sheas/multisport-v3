-- Add year support to existing tables
-- This migration adds year fields to teams, team_members, events, and games tables
-- and creates the years table for managing active years

-- Add year column to teams table
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "year" INTEGER DEFAULT 2025;

-- Add year column to events table  
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "year" INTEGER DEFAULT 2025;

-- Add year column to games table
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "year" INTEGER DEFAULT 2025;

-- Add year column to team_members table
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "year" INTEGER DEFAULT 2025;

-- Create years table
CREATE TABLE IF NOT EXISTS "years" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "years_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on year
CREATE UNIQUE INDEX IF NOT EXISTS "years_year_key" ON "years"("year");

-- Create indexes for year fields
CREATE INDEX IF NOT EXISTS "teams_year_idx" ON "teams"("year");
CREATE INDEX IF NOT EXISTS "events_year_idx" ON "events"("year");
CREATE INDEX IF NOT EXISTS "games_year_idx" ON "games"("year");
CREATE INDEX IF NOT EXISTS "team_members_year_idx" ON "team_members"("year");

-- Insert default year records
INSERT INTO "years" ("id", "year", "isActive", "description", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid()::text, 2024, false, 'Previous year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 2025, true, 'Current year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("year") DO NOTHING;

-- Update existing records to have year 2025
UPDATE "teams" SET "year" = 2025 WHERE "year" IS NULL;
UPDATE "events" SET "year" = 2025 WHERE "year" IS NULL;
UPDATE "games" SET "year" = 2025 WHERE "year" IS NULL;
UPDATE "team_members" SET "year" = 2025 WHERE "year" IS NULL;

-- Drop the old primary key constraint on team_members and recreate with year
-- First, drop the existing primary key
ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_pkey";

-- Create the new composite primary key
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("teamId", "playerId", "year");
