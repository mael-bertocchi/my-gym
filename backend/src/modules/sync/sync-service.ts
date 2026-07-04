import { Prisma, SyncEntityType, type PrismaClient } from 'prisma/generated/prisma/client';
import { resolveConflict } from 'src/modules/sync/sync-conflict';
import type { PushBody, SyncDeletionInput, SyncSettingInput, SyncWorkoutInput } from 'src/modules/sync/sync-models';

/**
 * @function pullChanges
 * @description Returns the caller's catalog, logs, and settings changed since a timestamp, plus deletion tombstones. An undefined `since` returns a full snapshot.
 *
 * @param {PrismaClient} prisma The Prisma client.
 * @param {string} userId The caller's id.
 * @param {Date | undefined} since The lower bound; only records changed after it are returned.
 * @returns {Promise<object>} The catalog, workouts, settings, and deletions for the client to apply.
 */
export async function pullChanges(prisma: PrismaClient, userId: string, since: Date | undefined) {
    const changed: Prisma.DateTimeFilter | undefined = since !== undefined ? { gt: since } : undefined;

    const [brands, exerciseGroups, exercises, gyms, workouts, exerciseSettings, deletions] = await Promise.all([
        prisma.brand.findMany({ where: { userId, updatedAt: changed } }),
        prisma.exerciseGroup.findMany({ where: { userId, updatedAt: changed } }),
        prisma.exercise.findMany({ where: { userId, updatedAt: changed } }),
        prisma.gym.findMany({ where: { userId, updatedAt: changed } }),
        prisma.workout.findMany({
            where: { userId, updatedAt: changed }, select: {
                id: true,
                gymId: true,
                name: true,
                startedAt: true,
                endedAt: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
                entries: {
                    orderBy: { position: Prisma.SortOrder.asc },
                    select: {
                        id: true,
                        exerciseId: true,
                        position: true,
                        notes: true,
                        settings: true,
                        supersetId: true,
                        createdAt: true,
                        sets: {
                            orderBy: { setNumber: Prisma.SortOrder.asc },
                            select: {
                                id: true,
                                setNumber: true,
                                setType: true,
                                weightKg: true,
                                reps: true,
                                distanceM: true,
                                durationSeconds: true,
                                isCompleted: true,
                                createdAt: true
                            }
                        }
                    }
                }
            }, orderBy: { updatedAt: 'asc' }
        }),
        prisma.exerciseSetting.findMany({
            where: { userId, updatedAt: changed }, select: {
                id: true,
                exerciseId: true,
                settings: true,
                createdAt: true,
                updatedAt: true
            }, orderBy: { updatedAt: 'asc' }
        }),
        prisma.syncDeletion.findMany({
            where: { userId, deletedAt: changed },
            select: { entityType: true, entityId: true, deletedAt: true },
            orderBy: { deletedAt: 'asc' }
        })
    ]);

    return {
        catalog: { brands, exerciseGroups, exercises, gyms },
        workouts,
        exerciseSettings,
        deletions
    };
}

/**
 * @function applyWorkout
 * @description Upserts a pushed workout aggregate under last-write-wins, replacing its exercises and sets to match the payload. Validates catalog references and caller ownership.
 *
 * @param {PrismaClient} prisma The Prisma client.
 * @param {string} userId The caller's id.
 * @param {SyncWorkoutInput} workout The pushed workout aggregate.
 * @returns {Promise<object>} A per-item result with status and the canonical workout when applied/kept.
 */
async function applyWorkout(prisma: PrismaClient, userId: string, workout: SyncWorkoutInput) {
    try {
        const gymId = workout.gymId ?? null;

        if (gymId !== null) {
            const gym = await prisma.gym.findFirst({ where: { id: gymId, userId }, select: { id: true } });
            if (gym === null) {
                return { id: workout.id, status: 'error', message: 'Gym not found' };
            }
        }

        const exerciseIds = [...new Set(workout.exercises.map((entry) => entry.exerciseId))];
        if (exerciseIds.length !== 0) {
            const found = await prisma.exercise.findMany({ where: { id: { in: exerciseIds }, userId }, select: { id: true } });
            if (found.length !== exerciseIds.length) {
                return { id: workout.id, status: 'error', message: 'One or more exercises not found' };
            }
        }

        const existing = await prisma.workout.findUnique({ where: { id: workout.id }, select: { userId: true, updatedAt: true } });

        if (existing !== null && existing.userId !== userId) {
            return { id: workout.id, status: 'error', message: 'Workout belongs to another account' };
        }

        if (existing !== null && resolveConflict(existing.updatedAt, workout.updatedAt) === 'keep') {
            const current = await prisma.workout.findUnique({
                where: { id: workout.id }, select: {
                    id: true,
                    gymId: true,
                    name: true,
                    startedAt: true,
                    endedAt: true,
                    notes: true,
                    createdAt: true,
                    updatedAt: true,
                    entries: {
                        orderBy: { position: Prisma.SortOrder.asc },
                        select: {
                            id: true,
                            exerciseId: true,
                            position: true,
                            notes: true,
                            settings: true,
                            supersetId: true,
                            createdAt: true,
                            sets: {
                                orderBy: { setNumber: Prisma.SortOrder.asc },
                                select: {
                                    id: true,
                                    setNumber: true,
                                    setType: true,
                                    weightKg: true,
                                    reps: true,
                                    distanceM: true,
                                    durationSeconds: true,
                                    isCompleted: true,
                                    createdAt: true
                                }
                            }
                        }
                    }
                }
            });
            return { id: workout.id, status: 'kept_server', workout: current };
        }

        await prisma.$transaction(async (tx) => {
            await tx.workout.upsert({
                where: { id: workout.id },
                create: { id: workout.id, userId, gymId, name: workout.name ?? null, startedAt: workout.startedAt, endedAt: workout.endedAt ?? null, notes: workout.notes ?? null, updatedAt: workout.updatedAt },
                update: { gymId, name: workout.name ?? null, startedAt: workout.startedAt, endedAt: workout.endedAt ?? null, notes: workout.notes ?? null, updatedAt: workout.updatedAt }
            });

            await tx.workoutExercise.deleteMany({ where: { workoutId: workout.id } });

            for (const entry of workout.exercises) {
                const settings = entry.settings ?? null;

                await tx.workoutExercise.create({
                    data: {
                        id: entry.id,
                        workoutId: workout.id,
                        exerciseId: entry.exerciseId,
                        position: entry.position,
                        notes: entry.notes ?? null,
                        settings: settings !== null ? (settings as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
                        supersetId: entry.supersetId ?? null,
                        sets: {
                            create: entry.sets.map((set) => ({
                                id: set.id,
                                setNumber: set.setNumber,
                                setType: set.setType,
                                weightKg: set.weightKg ?? null,
                                reps: set.reps ?? null,
                                distanceM: set.distanceM ?? null,
                                durationSeconds: set.durationSeconds ?? null,
                                isCompleted: set.isCompleted ?? false
                            }))
                        }
                    }
                });
            }
        });

        const saved = await prisma.workout.findUnique({
            where: { id: workout.id }, select: {
                id: true,
                gymId: true,
                name: true,
                startedAt: true,
                endedAt: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
                entries: {
                    orderBy: { position: Prisma.SortOrder.asc },
                    select: {
                        id: true,
                        exerciseId: true,
                        position: true,
                        notes: true,
                        settings: true,
                        supersetId: true,
                        createdAt: true,
                        sets: {
                            orderBy: { setNumber: Prisma.SortOrder.asc },
                            select: {
                                id: true,
                                setNumber: true,
                                setType: true,
                                weightKg: true,
                                reps: true,
                                distanceM: true,
                                durationSeconds: true,
                                isCompleted: true,
                                createdAt: true
                            }
                        }
                    }
                }
            }
        });
        return { id: workout.id, status: 'applied', workout: saved };
    } catch (error: unknown) {
        return { id: workout.id, status: 'error', message: error instanceof Error ? error.message : 'Failed to apply workout' };
    }
}

/**
 * @function applySetting
 * @description Upserts a pushed remembered setting under last-write-wins, resolved by its (user, exercise) natural key.
 *
 * @param {PrismaClient} prisma The Prisma client.
 * @param {string} userId The caller's id.
 * @param {SyncSettingInput} setting The pushed remembered setting.
 * @returns {Promise<object>} A per-item result with status and the canonical setting when applied/kept.
 */
async function applySetting(prisma: PrismaClient, userId: string, setting: SyncSettingInput) {
    try {
        const exercise = await prisma.exercise.findFirst({ where: { id: setting.exerciseId, userId }, select: { id: true } });
        if (exercise === null) {
            return { id: setting.id, status: 'error', message: 'Exercise not found' };
        }

        const key = { userId_exerciseId: { userId, exerciseId: setting.exerciseId } };
        const existing = await prisma.exerciseSetting.findUnique({ where: key, select: { id: true, updatedAt: true } });

        if (existing !== null && resolveConflict(existing.updatedAt, setting.updatedAt) === 'keep') {
            const current = await prisma.exerciseSetting.findUnique({
                where: key, select: {
                    id: true,
                    exerciseId: true,
                    settings: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            return { id: existing.id, status: 'kept_server', setting: current };
        }

        const settings = setting.settings as unknown as Prisma.InputJsonValue;
        const saved = await prisma.exerciseSetting.upsert({
            where: key,
            update: { settings, updatedAt: setting.updatedAt },
            create: { id: setting.id, userId, exerciseId: setting.exerciseId, settings, updatedAt: setting.updatedAt },
            select: {
                id: true,
                exerciseId: true,
                settings: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return { id: saved.id, status: 'applied', setting: saved };
    } catch (error: unknown) {
        return { id: setting.id, status: 'error', message: error instanceof Error ? error.message : 'Failed to apply setting' };
    }
}

/**
 * @function applyDeletion
 * @description Deletes the caller's workout or setting if present and records a tombstone, so the deletion propagates to other devices.
 *
 * @param {PrismaClient} prisma The Prisma client.
 * @param {string} userId The caller's id.
 * @param {SyncDeletionInput} deletion The pushed deletion.
 * @returns {Promise<object>} A per-item result with status.
 */
async function applyDeletion(prisma: PrismaClient, userId: string, deletion: SyncDeletionInput) {
    if (deletion.entityType === SyncEntityType.WORKOUT) {
        const existing = await prisma.workout.findFirst({ where: { id: deletion.entityId, userId }, select: { id: true } });
        if (existing === null) {
            return { entityType: deletion.entityType, entityId: deletion.entityId, status: 'not_found' };
        }

        await prisma.$transaction([
            prisma.workout.delete({ where: { id: deletion.entityId } }),
            prisma.syncDeletion.create({ data: { userId, entityType: SyncEntityType.WORKOUT, entityId: deletion.entityId } })
        ]);

        return { entityType: deletion.entityType, entityId: deletion.entityId, status: 'deleted' };
    }

    const existing = await prisma.exerciseSetting.findFirst({ where: { id: deletion.entityId, userId }, select: { id: true } });
    if (existing !== null) {
        await prisma.$transaction([
            prisma.exerciseSetting.delete({ where: { id: deletion.entityId } }),
            prisma.syncDeletion.create({ data: { userId, entityType: SyncEntityType.EXERCISE_SETTING, entityId: deletion.entityId } })
        ]);

        return { entityType: deletion.entityType, entityId: deletion.entityId, status: 'deleted' };
    }

    return { entityType: deletion.entityType, entityId: deletion.entityId, status: 'not_found' };
}

/**
 * @function pushChanges
 * @description Applies a batch of queued offline changes item by item (partial success) and returns a per-item result set.
 *
 * @param {PrismaClient} prisma The Prisma client.
 * @param {string} userId The caller's id.
 * @param {PushBody} body The validated batch of workouts, settings, and deletions.
 * @returns {Promise<object>} Per-item results for workouts, settings, and deletions.
 */
export async function pushChanges(prisma: PrismaClient, userId: string, body: PushBody) {
    const workouts = [];
    for (const workout of body.workouts) {
        workouts.push(await applyWorkout(prisma, userId, workout));
    }

    const exerciseSettings = [];
    for (const setting of body.exerciseSettings) {
        exerciseSettings.push(await applySetting(prisma, userId, setting));
    }

    const deletions = [];
    for (const deletion of body.deletions) {
        deletions.push(await applyDeletion(prisma, userId, deletion));
    }

    return { workouts, exerciseSettings, deletions };
}
