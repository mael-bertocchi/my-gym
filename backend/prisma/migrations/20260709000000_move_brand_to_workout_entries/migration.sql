-- AlterTable
ALTER TABLE "workout_exercises" ADD COLUMN "brand_id" TEXT;

-- Backfill
UPDATE "workout_exercises"
SET "brand_id" = "exercises"."brand_id"
FROM "exercises"
WHERE "workout_exercises"."exercise_id" = "exercises"."id";

-- CreateIndex
CREATE INDEX "workout_exercises_brand_id_idx" ON "workout_exercises"("brand_id");

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_brand_id_fkey";

-- DropIndex
DROP INDEX "exercises_brand_id_idx";

-- AlterTable
ALTER TABLE "exercises" DROP COLUMN "brand_id";
