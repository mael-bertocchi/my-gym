import type { PrismaClient } from 'prisma/generated/prisma/client';
import type { AssistantContext, ContextWorkout } from 'src/assets/prompts/assistant';
import { computeMuscleBreakdown } from 'src/modules/stats/stats-muscles';
import { computePersonalRecords } from 'src/modules/stats/stats-records';

/**
 * @constant RECENT_WORKOUT_LIMIT
 * @description Number of recent workouts included in the assistant context.
 */
const RECENT_WORKOUT_LIMIT = 5;

/**
 * @constant TOP_RECORD_LIMIT
 * @description Number of top lifts (by estimated 1RM) included in the assistant context.
 */
const TOP_RECORD_LIMIT = 8;

/**
 * @constant TOP_MUSCLE_LIMIT
 * @description Number of muscle groups included in the assistant context.
 */
const TOP_MUSCLE_LIMIT = 8;

/**
 * @constant MUSCLE_WINDOW_MS
 * @description Recency window for the muscle-balance summary (30 days).
 */
const MUSCLE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * @function loadAssistantContext
 * @description Assembles the caller's own training data — recent workouts, top personal records, and recent muscle balance — to ground the assistant.
 *
 * @param {PrismaClient} prisma The Prisma client.
 * @param {string} userId The caller's id.
 * @returns {Promise<AssistantContext>} The assembled context.
 */
export async function loadAssistantContext(prisma: PrismaClient, userId: string): Promise<AssistantContext> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });

    const workouts = await prisma.workout.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: RECENT_WORKOUT_LIMIT,
        select: {
            startedAt: true,
            gym: { select: { name: true } },
            entries: {
                orderBy: { position: 'asc' },
                select: {
                    exercise: { select: { name: true } },
                    sets: { where: { setType: 'NORMAL' }, select: { weightKg: true, reps: true } }
                }
            }
        }
    });

    const recentWorkouts: ContextWorkout[] = workouts.map((workout) => ({
        date: workout.startedAt.toISOString(),
        gym: workout.gym?.name ?? null,
        exercises: workout.entries.map((entry) => {
            let topWeight = -1;
            let topSet: string | null = null;

            for (const set of entry.sets) {
                const weight = set.weightKg !== null ? set.weightKg.toNumber() : null;
                if (weight !== null && weight > topWeight) {
                    topWeight = weight;
                    topSet = `${weight}kg x ${set.reps ?? 0}`;
                }
            }

            return { name: entry.exercise.name, setCount: entry.sets.length, topSet };
        })
    }));

    const exercises = await prisma.exercise.findMany({
        where: { workoutEntries: { some: { workout: { userId } } } },
        select: {
            id: true,
            name: true,
            workoutEntries: {
                where: { workout: { userId } },
                select: { sets: { where: { setType: 'NORMAL' }, select: { weightKg: true, reps: true } } }
            }
        }
    });

    const recordEntries = exercises.map((exercise) => ({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: exercise.workoutEntries.flatMap((entry) => entry.sets.map((set) => ({
            weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
            reps: set.reps
        })))
    }));

    const personalRecords = computePersonalRecords(recordEntries)
        .filter((record) => record.bestEstimated1RM !== null)
        .sort((left, right) => (right.bestEstimated1RM ?? 0) - (left.bestEstimated1RM ?? 0))
        .slice(0, TOP_RECORD_LIMIT)
        .map((record) => ({ name: record.exerciseName, heaviestKg: record.heaviestKg, bestEstimated1RM: record.bestEstimated1RM }));

    const since = new Date(Date.now() - MUSCLE_WINDOW_MS);
    const muscleWorkouts = await prisma.workout.findMany({
        where: { userId, startedAt: { gte: since } },
        select: {
            entries: {
                select: {
                    exercise: { select: { primaryMuscle: true, secondaryMuscles: true } },
                    sets: { where: { setType: 'NORMAL' }, select: { weightKg: true, reps: true } }
                }
            }
        }
    });

    const muscleEntries = muscleWorkouts.flatMap((workout) => workout.entries.map((entry) => ({
        primaryMuscle: entry.exercise.primaryMuscle,
        secondaryMuscles: entry.exercise.secondaryMuscles,
        sets: entry.sets.map((set) => ({
            weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
            reps: set.reps
        }))
    })));

    const muscleBalance = computeMuscleBreakdown(muscleEntries)
        .slice(0, TOP_MUSCLE_LIMIT)
        .map((muscle) => ({ muscle: muscle.muscle, sets: muscle.sets, volume: muscle.volume }));

    return {
        displayName: user?.displayName ?? 'Athlete',
        recentWorkouts,
        personalRecords,
        muscleBalance
    };
}
