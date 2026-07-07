-- DropForeignKey
ALTER TABLE "exercise_groups" DROP CONSTRAINT "exercise_groups_user_id_fkey";

-- DropForeignKey
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_group_id_fkey";

-- DropIndex
DROP INDEX "exercises_group_id_idx";

-- AlterTable
ALTER TABLE "exercises" DROP COLUMN "group_id";

-- DropTable
DROP TABLE "exercise_groups";

