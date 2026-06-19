-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('KG', 'LBS');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('BARBELL', 'DUMBBELL', 'MACHINE', 'SMITH_MACHINE', 'CABLE', 'PLATE_LOADED', 'KETTLEBELL', 'RESISTANCE_BAND', 'BODYWEIGHT', 'EZ_BAR', 'TRAP_BAR', 'OTHER');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'UPPER_BACK', 'LATS', 'LOWER_BACK', 'TRAPEZIUS', 'FRONT_DELTS', 'SIDE_DELTS', 'REAR_DELTS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'ABS', 'OBLIQUES', 'ADDUCTORS', 'ABDUCTORS', 'NECK', 'FULL_BODY');

-- CreateEnum
CREATE TYPE "SetType" AS ENUM ('WARMUP', 'WORKING', 'DROP', 'FAILURE');

-- CreateEnum
CREATE TYPE "AiContentStatus" AS ENUM ('PENDING', 'GENERATED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "is_administrator" BOOLEAN NOT NULL DEFAULT false,
    "weight_unit" "WeightUnit" NOT NULL DEFAULT 'KG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodyweight_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "weight_kg" DECIMAL(6,2) NOT NULL,
    "measured_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bodyweight_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primary_muscle" "MuscleGroup" NOT NULL,
    "secondary_muscles" "MuscleGroup"[],
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_variants" (
    "id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "equipment_type" "EquipmentType" NOT NULL,
    "machine_brand_id" TEXT,
    "form_summary" TEXT,
    "instructions" TEXT,
    "equipment_tips" TEXT,
    "preview_image_url" TEXT,
    "ai_content_status" "AiContentStatus" NOT NULL DEFAULT 'PENDING',
    "ai_generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_brands" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_brands" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_locations" (
    "id" TEXT NOT NULL,
    "gym_brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gym_location_id" TEXT,
    "name" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "id" TEXT NOT NULL,
    "workout_id" TEXT NOT NULL,
    "exercise_variant_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "set_entries" (
    "id" TEXT NOT NULL,
    "workout_exercise_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "set_type" "SetType" NOT NULL DEFAULT 'WORKING',
    "weight_kg" DECIMAL(6,2),
    "reps" INTEGER,
    "rpe" DECIMAL(3,1),
    "rest_seconds" INTEGER,
    "duration_seconds" INTEGER,
    "tempo" TEXT,
    "notes" TEXT,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "set_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "bodyweight_entries_user_id_measured_at_idx" ON "bodyweight_entries"("user_id", "measured_at");

-- CreateIndex
CREATE INDEX "exercises_user_id_primary_muscle_idx" ON "exercises"("user_id", "primary_muscle");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_user_id_name_key" ON "exercises"("user_id", "name");

-- CreateIndex
CREATE INDEX "exercise_variants_machine_brand_id_idx" ON "exercise_variants"("machine_brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_variants_exercise_id_equipment_type_machine_brand__key" ON "exercise_variants"("exercise_id", "equipment_type", "machine_brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "machine_brands_user_id_name_key" ON "machine_brands"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "gym_brands_user_id_name_key" ON "gym_brands"("user_id", "name");

-- CreateIndex
CREATE INDEX "gym_locations_gym_brand_id_idx" ON "gym_locations"("gym_brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "gym_locations_gym_brand_id_name_key" ON "gym_locations"("gym_brand_id", "name");

-- CreateIndex
CREATE INDEX "workouts_user_id_started_at_idx" ON "workouts"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "workouts_gym_location_id_idx" ON "workouts"("gym_location_id");

-- CreateIndex
CREATE INDEX "workout_exercises_workout_id_position_idx" ON "workout_exercises"("workout_id", "position");

-- CreateIndex
CREATE INDEX "workout_exercises_exercise_variant_id_idx" ON "workout_exercises"("exercise_variant_id");

-- CreateIndex
CREATE INDEX "set_entries_workout_exercise_id_set_number_idx" ON "set_entries"("workout_exercise_id", "set_number");

-- AddForeignKey
ALTER TABLE "bodyweight_entries" ADD CONSTRAINT "bodyweight_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_variants" ADD CONSTRAINT "exercise_variants_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_variants" ADD CONSTRAINT "exercise_variants_machine_brand_id_fkey" FOREIGN KEY ("machine_brand_id") REFERENCES "machine_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_brands" ADD CONSTRAINT "machine_brands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_brands" ADD CONSTRAINT "gym_brands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_locations" ADD CONSTRAINT "gym_locations_gym_brand_id_fkey" FOREIGN KEY ("gym_brand_id") REFERENCES "gym_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_gym_location_id_fkey" FOREIGN KEY ("gym_location_id") REFERENCES "gym_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_variant_id_fkey" FOREIGN KEY ("exercise_variant_id") REFERENCES "exercise_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_entries" ADD CONSTRAINT "set_entries_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
