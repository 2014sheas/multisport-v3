-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "duration" INTEGER;

-- CreateIndex
CREATE INDEX "elo_history_event_id_idx" ON "public"."elo_history"("eventId");

-- CreateIndex
CREATE INDEX "elo_history_player_id_idx" ON "public"."elo_history"("playerId");

-- CreateIndex
CREATE INDEX "elo_history_player_timestamp_event_idx" ON "public"."elo_history"("playerId", "timestamp", "eventId");

-- CreateIndex
CREATE INDEX "elo_history_player_timestamp_idx" ON "public"."elo_history"("playerId", "timestamp");

-- CreateIndex
CREATE INDEX "elo_history_timestamp_idx" ON "public"."elo_history"("timestamp");

-- CreateIndex
CREATE INDEX "event_ratings_event_id_idx" ON "public"."event_ratings"("eventId");

-- CreateIndex
CREATE INDEX "event_ratings_event_rating_idx" ON "public"."event_ratings"("eventId", "rating" DESC);

-- CreateIndex
CREATE INDEX "event_ratings_player_id_idx" ON "public"."event_ratings"("playerId");

-- CreateIndex
CREATE INDEX "event_ratings_rating_idx" ON "public"."event_ratings"("rating");

-- CreateIndex
CREATE INDEX "players_name_idx" ON "public"."players"("name");

-- CreateIndex
CREATE INDEX "players_elo_rating_idx" ON "public"."players"("eloRating");

-- CreateIndex
CREATE INDEX "players_is_active_idx" ON "public"."players"("isActive");

-- CreateIndex
CREATE INDEX "team_members_player_id_idx" ON "public"."team_members"("playerId");

-- CreateIndex
CREATE INDEX "team_members_player_team_idx" ON "public"."team_members"("playerId", "teamId");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "public"."team_members"("teamId");

-- CreateIndex
CREATE INDEX "teams_captain_id_idx" ON "public"."teams"("captainId", "id");

-- CreateIndex
CREATE INDEX "votes_event_id_idx" ON "public"."votes"("eventId");

-- CreateIndex
CREATE INDEX "votes_timestamp_idx" ON "public"."votes"("timestamp");
