-- CreateEnum
CREATE TYPE "ExerciseBrandMode" AS ENUM ('NONE', 'SINGLE', 'MULTIPLE');

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN "brand_mode" "ExerciseBrandMode" NOT NULL DEFAULT 'NONE';
ALTER TABLE "exercises" ADD COLUMN "brand_id" TEXT;

-- Backfill
UPDATE "exercises"
SET "brand_mode" = "usage"."mode", "brand_id" = "usage"."only_brand_id"
FROM (
    SELECT "exercise_id",
        (CASE WHEN COUNT(DISTINCT "brand_id") = 1 THEN 'SINGLE' ELSE 'MULTIPLE' END)::"ExerciseBrandMode" AS "mode",
        CASE WHEN COUNT(DISTINCT "brand_id") = 1 THEN MIN("brand_id") END AS "only_brand_id"
    FROM "workout_exercises"
    WHERE "brand_id" IS NOT NULL
    GROUP BY "exercise_id"
) AS "usage"
WHERE "exercises"."id" = "usage"."exercise_id";

-- CreateIndex
CREATE INDEX "exercises_brand_id_idx" ON "exercises"("brand_id");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
