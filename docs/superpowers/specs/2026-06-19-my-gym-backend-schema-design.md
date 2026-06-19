# my-gym — Backend foundation & data model design

**Date:** 2026-06-19
**Status:** Approved (schema + scaffold). Domain routes, AI logic, and frontend pending.

## Goal

A personal, single-user workout tracker (Hevy-like, no social). This spec covers the
monorepo layout, the Fastify backend skeleton, and the Prisma data model. It deliberately
stops before domain routes and the Expo frontend.

## Tech stack

- **Backend:** Fastify 5 + TypeScript (ESM), conventions mirrored from `JetAviation/Vector/Backend`.
- **Database:** PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter.
- **AI:** Google AI Studio (Gemini) — generateContent + streaming — via a `fastify.ai` plugin.
- **Validation:** Zod 4 + `fastify-type-provider-zod`. **Env:** `@fastify/env` + TypeBox.
- **Tests:** Vitest.

## Decisions (locked)

- **Set logging:** rich — `setType` (warmup/working/drop/failure), `weightKg`, `reps`, `rpe`,
  `restSeconds`, `durationSeconds`, `tempo`, `notes`, `isCompleted`.
- **Units:** all weights stored in **kilograms**; `User.weightUnit` is a display preference only.
- **Categorization:** `Exercise.primaryMuscle` (single) + `secondaryMuscles` (enum array).
- **User:** a single `User` row anchors all data, settings, and a bodyweight log. No auth yet.
- **Env var:** `DATABASE_URL` (Prisma-standard) rather than the house `POSTGRESQL_URL`.

## Entity model

Two-level definition: **`Exercise`** (abstract movement, owns muscle metadata) → **`ExerciseVariant`**
(movement + `equipmentType` + optional `MachineBrand`). **The variant is the unit of progression**,
so a Chest Press on Matrix vs. LifeFitness have independent set histories. AI coaching content
(`formSummary`, `instructions`, `equipmentTips`, `previewImageUrl`, `aiContentStatus`) lives on the
variant, enabling equipment/brand-specific tips.

Logging: **`Workout`** (session, optionally tagged with a `GymLocation`) → **`WorkoutExercise`**
(a variant performed in that session) → **`SetEntry`** (one logged set).

Locations: **`GymBrand`** → **`GymLocation`**. A workout references a location for **stats filtering
only** — location never splits a progression track (brand does).

Owner: **`User`** owns `Exercise`, `MachineBrand`, `GymBrand`, `Workout`, `BodyweightEntry`.

### Key constraints & indexes

- `Exercise` unique on `(userId, name)`.
- `ExerciseVariant` unique on `(exerciseId, equipmentType, machineBrandId)`; indexed on `machineBrandId`.
- `MachineBrand` / `GymBrand` unique on `(userId, name)`; `GymLocation` unique on `(gymBrandId, name)`.
- `Workout` indexed on `(userId, startedAt)` and `gymLocationId`.
- `WorkoutExercise` indexed on `(workoutId, position)` and `exerciseVariantId` (progression queries).
- `SetEntry` indexed on `(workoutExerciseId, setNumber)`.

### Known nuances

- **Brand requirement:** required only for `EquipmentType.MACHINE`; enforced at the service layer
  (no DB-level conditional requirement).
- **Null-brand uniqueness:** the `@@unique` on `ExerciseVariant` does not prevent duplicate
  *non-machine* variants because Postgres treats `NULL` brand as distinct. Enforced in the
  create-variant service; a partial unique index (`WHERE machine_brand_id IS NULL`) can be added
  via a raw migration if a hard DB guarantee is wanted.
- **Decimals:** `weightKg` (`Decimal(6,2)`) and `rpe` (`Decimal(3,1)`) are the only `@db.*` usages —
  justified because the reference repo had no decimal fields.

## AI integration (later phase)

- `src/plugins/google-ai.ts` exposes `fastify.ai` with `chat<T>()` (JSON mode) and `stream()` (SSE + function calls).
- **Onboarding:** on exercise/variant creation, call `ai.chat` to populate `formSummary`,
  `instructions`, `equipmentTips`; set `aiContentStatus` accordingly (generate async; default `PENDING`).
- **Assistant:** an endpoint that reads a user's workout history (grouped by `ExerciseVariant`) and
  streams progressive-overload advice via `ai.stream`.

## Backend layout

```
backend/
├─ src/
│  ├─ index.ts            # bootstrap: plugins, error/404 handlers, route registration
│  ├─ modules/health/     # health + Gemini readiness checks (canonical module example)
│  ├─ plugins/            # environment, database, security, google-ai
│  ├─ shared/             # RequestError, pagination, reusable Zod schemas
│  └─ types/fastify.d.ts  # instance augmentation (prisma, ai, variables)
├─ prisma/schema.prisma   # datasource URL supplied by prisma.config.ts
└─ (tsconfig, eslint, vitest, prisma.config, .env.example)
```

## Out of scope (YAGNI for now)

Workout templates/routines, authentication, multi-user, cardio-specific metrics. Each can be added
later without disturbing the core model.

## Next phases

1. Domain modules: `exercises` (+ variants, AI onboarding), `machine-brands`, `gym-brands`/`gym-locations`,
   `workouts` (+ sets), `assistant`, `stats`.
2. Expo (React Native + TypeScript) frontend.
