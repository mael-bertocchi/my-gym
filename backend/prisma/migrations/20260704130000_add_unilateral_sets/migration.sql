-- CreateEnum
CREATE TYPE "SetSide" AS ENUM ('LEFT', 'RIGHT');

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN "is_unilateral" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workout_sets" ADD COLUMN "side" "SetSide";
