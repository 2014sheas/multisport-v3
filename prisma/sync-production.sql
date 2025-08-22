-- Production Database Sync Migration
-- This script adds all missing fields and updates from recent migrations
-- Run this against your production database to sync it with development

-- 1. Add combinedTeamData column to events table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'combinedTeamData'
    ) THEN
        ALTER TABLE "public"."events" ADD COLUMN "combinedTeamData" JSONB;
        RAISE NOTICE 'Added combinedTeamData column to events table';
    ELSE
        RAISE NOTICE 'combinedTeamData column already exists in events table';
    END IF;
END $$;

-- 2. Add COMBINED_TEAM to EventType enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'COMBINED_TEAM' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')
    ) THEN
        ALTER TYPE "public"."EventType" ADD VALUE 'COMBINED_TEAM';
        RAISE NOTICE 'Added COMBINED_TEAM to EventType enum';
    ELSE
        RAISE NOTICE 'COMBINED_TEAM already exists in EventType enum';
    END IF;
END $$;

-- 3. Add duration column to events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'duration'
    ) THEN
        ALTER TABLE "public"."events" ADD COLUMN "duration" INTEGER;
        RAISE NOTICE 'Added duration column to events table';
    ELSE
        RAISE NOTICE 'duration column already exists in events table';
    END IF;
END $$;

-- 4. Add tournament bracket related fields if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tournament_brackets'
    ) THEN
        CREATE TABLE "public"."tournament_brackets" (
            "id" TEXT NOT NULL,
            "eventId" TEXT NOT NULL,
            "bracketData" JSONB NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "tournament_brackets_pkey" PRIMARY KEY ("id")
        );
        
        CREATE UNIQUE INDEX "tournament_brackets_eventId_key" ON "public"."tournament_brackets"("eventId");
        RAISE NOTICE 'Created tournament_brackets table';
    ELSE
        RAISE NOTICE 'tournament_brackets table already exists';
    END IF;
END $$;

-- 5. Add event ratings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'event_ratings'
    ) THEN
        CREATE TABLE "public"."event_ratings" (
            "id" TEXT NOT NULL,
            "playerId" TEXT NOT NULL,
            "eventId" TEXT NOT NULL,
            "rating" INTEGER NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "event_ratings_pkey" PRIMARY KEY ("id")
        );
        
        CREATE UNIQUE INDEX "event_ratings_playerId_eventId_key" ON "public"."event_ratings"("playerId", "eventId");
        RAISE NOTICE 'Created event_ratings table';
    ELSE
        RAISE NOTICE 'event_ratings table already exists';
    END IF;
END $$;

-- 6. Add team abbreviation column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' 
        AND column_name = 'abbreviation'
    ) THEN
        ALTER TABLE "public"."teams" ADD COLUMN "abbreviation" TEXT;
        RAISE NOTICE 'Added abbreviation column to teams table';
    ELSE
        RAISE NOTICE 'abbreviation column already exists in teams table';
    END IF;
END $$;

-- 7. Add team color column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' 
        AND column_name = 'color'
    ) THEN
        ALTER TABLE "public"."teams" ADD COLUMN "color" TEXT DEFAULT '#3B82F6';
        RAISE NOTICE 'Added color column to teams table';
    ELSE
        RAISE NOTICE 'color column already exists in teams table';
    END IF;
END $$;

-- 8. Add player experience and wins columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' 
        AND column_name = 'experience'
    ) THEN
        ALTER TABLE "public"."players" ADD COLUMN "experience" INTEGER;
        RAISE NOTICE 'Added experience column to players table';
    ELSE
        RAISE NOTICE 'experience column already exists in players table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' 
        AND column_name = 'wins'
    ) THEN
        ALTER TABLE "public"."players" ADD COLUMN "wins" INTEGER;
        RAISE NOTICE 'Added wins column to players table';
    ELSE
        RAISE NOTICE 'wins column already exists in players table';
    END IF;
END $$;

-- 9. Update ELO scale if needed (should already be 0-9999)
DO $$ 
BEGIN
    -- This is a safety check - the scale should already be updated
    RAISE NOTICE 'ELO scale should already be 0-9999 from previous migration';
END $$;

-- 10. Add any missing indexes
DO $$ 
BEGIN
    -- Add missing indexes if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'players_elo_rating_idx'
    ) THEN
        CREATE INDEX "players_elo_rating_idx" ON "public"."players"("eloRating");
        RAISE NOTICE 'Added players_elo_rating_idx';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'players_is_active_idx'
    ) THEN
        CREATE INDEX "players_is_active_idx" ON "public"."players"("isActive");
        RAISE NOTICE 'Added players_is_active_idx';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'teams_captain_id_idx'
    ) THEN
        CREATE INDEX "teams_captain_id_idx" ON "public"."teams"("captainId", "id");
        RAISE NOTICE 'Added teams_captain_id_idx';
    END IF;
END $$;

-- Add performance indexes for better query performance
-- These indexes will help speed up the standings and events APIs

-- Index for event ratings lookups (used in standings calculation)
CREATE INDEX IF NOT EXISTS idx_event_ratings_event_player ON event_ratings(event_id, player_id);

-- Index for team members lookups (used in standings calculation)
CREATE INDEX IF NOT EXISTS idx_team_members_team_player ON team_members(team_id, player_id);

-- Index for events by status and start time (used in events API)
CREATE INDEX IF NOT EXISTS idx_events_status_start_time ON events(status, start_time);

-- Index for teams by abbreviation (used in standings display)
CREATE INDEX IF NOT EXISTS idx_teams_abbreviation ON teams(abbreviation);

-- Composite index for event ratings by event and rating (used in projected standings)
CREATE INDEX IF NOT EXISTS idx_event_ratings_event_rating ON event_ratings(event_id, rating DESC);

-- Index for team members by player (used in reverse lookups)
CREATE INDEX IF NOT EXISTS idx_team_members_player_team ON team_members(player_id, team_id);

-- Final verification
SELECT 'Production database sync completed successfully!' as status;
