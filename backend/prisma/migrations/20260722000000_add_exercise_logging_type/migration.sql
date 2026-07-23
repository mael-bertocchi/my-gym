-- CreateEnum
CREATE TYPE "ExerciseLoggingType" AS ENUM ('WEIGHT_REPS', 'BODYWEIGHT_REPS', 'DISTANCE_DURATION', 'STAIRS_DURATION', 'DURATION');

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN "logging_type" "ExerciseLoggingType" NOT NULL DEFAULT 'WEIGHT_REPS';

-- Backfill bodyweight exercises from the existing is_weighted flag
UPDATE "exercises" SET "logging_type" = 'BODYWEIGHT_REPS' WHERE "is_weighted" = false;

-- AlterTable: cardio exercises have no muscle
ALTER TABLE "exercises" ALTER COLUMN "primary_muscle" DROP NOT NULL;
