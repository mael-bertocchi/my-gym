import type { PrismaClient } from 'prisma/generated/prisma/client';
import { round } from 'src/shared/math';

/**
 * @interface PersonalRecord
 * @description A personal record achieved by a freshly saved working set.
 */
export interface PersonalRecord {
    type: 'heaviest' | 'best1RM' | 'bestVolume'; /*!< The kind of record: heaviest load, best estimated 1RM, or best set volume */
    value: number; /*!< The record value, rounded to one decimal */
}

/**
 * @function detectPersonalRecords
 * @description Compares a saved working set against the caller's prior history for the same exercise and reports any personal records it beats. Bodyweight (no load) and non-working sets never set records.
 *
 * @param {PrismaClient} prisma The Prisma client.
 * @param {string} userId The owning user's id.
 * @param {string} exerciseId The exercise the set was logged against.
 * @param {string} setId The id of the just-saved set.
 * @returns {Promise<PersonalRecord[]>} The records the set beats (possibly empty).
 */
export async function detectPersonalRecords(prisma: PrismaClient, userId: string, exerciseId: string, setId: string): Promise<PersonalRecord[]> {
    const current = await prisma.workoutSet.findUnique({
        where: { id: setId },
        select: { weightKg: true, reps: true, setType: true }
    });

    if (current === null || current.setType !== 'NORMAL' || current.weightKg === null) {
        return [];
    }

    const weight = current.weightKg.toNumber();
    const reps = current.reps ?? 0;
    const estimated1RM = reps > 0 ? weight * (1 + reps / 30) : weight;
    const volume = weight * reps;

    const priorSets = await prisma.workoutSet.findMany({
        where: {
            id: { not: setId },
            setType: 'NORMAL',
            weightKg: { not: null },
            workoutExercise: { exerciseId, workout: { userId } }
        },
        select: { weightKg: true, reps: true }
    });

    let bestWeight = 0;
    let best1RM = 0;
    let bestVolume = 0;

    for (const set of priorSets) {
        if (set.weightKg === null) {
            continue;
        }

        const priorWeight = set.weightKg.toNumber();
        const priorReps = set.reps ?? 0;
        bestWeight = Math.max(bestWeight, priorWeight);
        best1RM = Math.max(best1RM, priorReps > 0 ? priorWeight * (1 + priorReps / 30) : priorWeight);
        bestVolume = Math.max(bestVolume, priorWeight * priorReps);
    }

    const records: PersonalRecord[] = [];

    if (weight > bestWeight) {
        records.push({ type: 'heaviest', value: round(weight) });
    }
    if (estimated1RM > best1RM) {
        records.push({ type: 'best1RM', value: round(estimated1RM) });
    }
    if (volume > bestVolume) {
        records.push({ type: 'bestVolume', value: round(volume) });
    }

    return records;
}
