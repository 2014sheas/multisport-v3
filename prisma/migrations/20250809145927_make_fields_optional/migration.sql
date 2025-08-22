-- AlterTable
ALTER TABLE "public"."events" ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "startTime" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."players" ALTER COLUMN "experience" DROP NOT NULL,
ALTER COLUMN "experience" DROP DEFAULT,
ALTER COLUMN "wins" DROP NOT NULL,
ALTER COLUMN "wins" DROP DEFAULT;
