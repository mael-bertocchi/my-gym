-- AlterTable
ALTER TABLE "exercises" ADD COLUMN "equipment" "EquipmentType" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "exercises" ADD COLUMN "brand_id" TEXT;

-- Backfill
UPDATE "exercises"
SET "equipment" = "source"."type", "brand_id" = "source"."brand_id"
FROM "equipment" AS "source"
WHERE "exercises"."equipment_id" = "source"."id";

-- DropForeignKey
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_equipment_id_fkey";

-- DropIndex
DROP INDEX "exercises_equipment_id_idx";

-- AlterTable
ALTER TABLE "exercises" DROP COLUMN "equipment_id";

-- DropTable
DROP TABLE "equipment";

-- CreateIndex
CREATE INDEX "exercises_brand_id_idx" ON "exercises"("brand_id");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Dedupe (keep the most recently updated setting per user and exercise, tombstone the rest)
WITH "ranked" AS (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id", "exercise_id" ORDER BY "updated_at" DESC, "id") AS "rank"
    FROM "exercise_settings"
), "removed" AS (
    DELETE FROM "exercise_settings"
    WHERE "id" IN (SELECT "id" FROM "ranked" WHERE "rank" > 1)
    RETURNING "id", "user_id"
)
INSERT INTO "sync_deletions" ("id", "user_id", "entity_type", "entity_id")
SELECT gen_random_uuid()::text, "user_id", 'EXERCISE_SETTING', "id"
FROM "removed";

-- DropForeignKey
ALTER TABLE "exercise_settings" DROP CONSTRAINT "exercise_settings_gym_id_fkey";

-- DropIndex
DROP INDEX "exercise_settings_gym_id_idx";
DROP INDEX "exercise_settings_user_id_exercise_id_gym_id_key";

-- AlterTable
ALTER TABLE "exercise_settings" DROP COLUMN "gym_id";

-- CreateIndex
CREATE UNIQUE INDEX "exercise_settings_user_id_exercise_id_key" ON "exercise_settings"("user_id", "exercise_id");
