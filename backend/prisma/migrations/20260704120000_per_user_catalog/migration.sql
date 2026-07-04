-- DropIndex
DROP INDEX "brands_name_key";

-- DropIndex
DROP INDEX "exercise_groups_name_key";

-- DropIndex
DROP INDEX "exercises_name_key";

-- DropIndex
DROP INDEX "gyms_name_key";

-- AlterTable (nullable during the backfill below)
ALTER TABLE "brands" ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "exercise_groups" ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "user_id" TEXT;

-- Without any account the shared catalog has no possible owner (and nothing references it)
DELETE FROM "exercises" WHERE NOT EXISTS (SELECT 1 FROM "users");
DELETE FROM "brands" WHERE NOT EXISTS (SELECT 1 FROM "users");
DELETE FROM "exercise_groups" WHERE NOT EXISTS (SELECT 1 FROM "users");
DELETE FROM "gyms" WHERE NOT EXISTS (SELECT 1 FROM "users");

-- The oldest account keeps the existing rows, so its ids stay stable
CREATE TEMPORARY TABLE "catalog_owner" AS
SELECT "id" FROM "users" ORDER BY "created_at" ASC, "id" ASC LIMIT 1;

UPDATE "brands" SET "user_id" = (SELECT "id" FROM "catalog_owner");
UPDATE "exercise_groups" SET "user_id" = (SELECT "id" FROM "catalog_owner");
UPDATE "exercises" SET "user_id" = (SELECT "id" FROM "catalog_owner");
UPDATE "gyms" SET "user_id" = (SELECT "id" FROM "catalog_owner");

-- Every other account receives its own copy of the shared catalog
CREATE TEMPORARY TABLE "brand_copies" AS
SELECT b."id" AS "source_id", u."id" AS "user_id", gen_random_uuid()::text AS "copy_id"
FROM "brands" b
CROSS JOIN "users" u
WHERE u."id" NOT IN (SELECT "id" FROM "catalog_owner");

CREATE TEMPORARY TABLE "group_copies" AS
SELECT g."id" AS "source_id", u."id" AS "user_id", gen_random_uuid()::text AS "copy_id"
FROM "exercise_groups" g
CROSS JOIN "users" u
WHERE u."id" NOT IN (SELECT "id" FROM "catalog_owner");

CREATE TEMPORARY TABLE "exercise_copies" AS
SELECT e."id" AS "source_id", u."id" AS "user_id", gen_random_uuid()::text AS "copy_id"
FROM "exercises" e
CROSS JOIN "users" u
WHERE u."id" NOT IN (SELECT "id" FROM "catalog_owner");

CREATE TEMPORARY TABLE "gym_copies" AS
SELECT g."id" AS "source_id", u."id" AS "user_id", gen_random_uuid()::text AS "copy_id"
FROM "gyms" g
CROSS JOIN "users" u
WHERE u."id" NOT IN (SELECT "id" FROM "catalog_owner");

INSERT INTO "brands" ("id", "user_id", "name", "created_at", "updated_at")
SELECT c."copy_id", c."user_id", b."name", b."created_at", NOW()
FROM "brand_copies" c
JOIN "brands" b ON b."id" = c."source_id";

INSERT INTO "exercise_groups" ("id", "user_id", "name", "created_at", "updated_at")
SELECT c."copy_id", c."user_id", g."name", g."created_at", NOW()
FROM "group_copies" c
JOIN "exercise_groups" g ON g."id" = c."source_id";

INSERT INTO "exercises" ("id", "user_id", "name", "primary_muscle", "secondary_muscles", "equipment", "brand_id", "group_id", "is_favorite", "is_archived", "created_at", "updated_at")
SELECT c."copy_id", c."user_id", e."name", e."primary_muscle", e."secondary_muscles", e."equipment", bc."copy_id", gc."copy_id", e."is_favorite", e."is_archived", e."created_at", NOW()
FROM "exercise_copies" c
JOIN "exercises" e ON e."id" = c."source_id"
LEFT JOIN "brand_copies" bc ON bc."source_id" = e."brand_id" AND bc."user_id" = c."user_id"
LEFT JOIN "group_copies" gc ON gc."source_id" = e."group_id" AND gc."user_id" = c."user_id";

INSERT INTO "gyms" ("id", "user_id", "name", "address", "notes", "created_at", "updated_at")
SELECT c."copy_id", c."user_id", g."name", g."address", g."notes", g."created_at", NOW()
FROM "gym_copies" c
JOIN "gyms" g ON g."id" = c."source_id";

-- Point every non-owner account's references at its own copies
UPDATE "users" u
SET "default_gym_id" = gc."copy_id"
FROM "gym_copies" gc
WHERE gc."user_id" = u."id" AND gc."source_id" = u."default_gym_id";

UPDATE "workouts" w
SET "gym_id" = gc."copy_id"
FROM "gym_copies" gc
WHERE gc."user_id" = w."user_id" AND gc."source_id" = w."gym_id";

UPDATE "workout_exercises" we
SET "exercise_id" = ec."copy_id"
FROM "workouts" w, "exercise_copies" ec
WHERE w."id" = we."workout_id" AND ec."user_id" = w."user_id" AND ec."source_id" = we."exercise_id";

UPDATE "exercise_settings" es
SET "exercise_id" = ec."copy_id", "updated_at" = NOW()
FROM "exercise_copies" ec
WHERE ec."user_id" = es."user_id" AND ec."source_id" = es."exercise_id";

-- Re-sync non-owner devices: their workouts now reference the copied catalog
UPDATE "workouts"
SET "updated_at" = NOW()
WHERE "user_id" NOT IN (SELECT "id" FROM "catalog_owner");

DROP TABLE "catalog_owner";
DROP TABLE "brand_copies";
DROP TABLE "group_copies";
DROP TABLE "exercise_copies";
DROP TABLE "gym_copies";

-- AlterTable
ALTER TABLE "brands" ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "exercise_groups" ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "exercises" ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "gyms" ALTER COLUMN "user_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "brands_user_id_idx" ON "brands"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_user_id_name_key" ON "brands"("user_id", "name");

-- CreateIndex
CREATE INDEX "exercise_groups_user_id_idx" ON "exercise_groups"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_groups_user_id_name_key" ON "exercise_groups"("user_id", "name");

-- CreateIndex
CREATE INDEX "exercises_user_id_idx" ON "exercises"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_user_id_name_key" ON "exercises"("user_id", "name");

-- CreateIndex
CREATE INDEX "gyms_user_id_idx" ON "gyms"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "gyms_user_id_name_key" ON "gyms"("user_id", "name");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_groups" ADD CONSTRAINT "exercise_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gyms" ADD CONSTRAINT "gyms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
