-- AlterTable
ALTER TABLE "exercises" ADD COLUMN "requires_brand" BOOLEAN NOT NULL DEFAULT false;

-- Backfill
UPDATE "exercises"
SET "requires_brand" = true
WHERE "id" IN (SELECT DISTINCT "exercise_id" FROM "workout_exercises" WHERE "brand_id" IS NOT NULL);
