import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { Prisma, SyncEntityType } from 'prisma/generated/prisma/client';
import type { TargetWorkout, TargetWorkoutExercise } from 'src/assets/prompts/assistant';
import { generateWorkoutSummary as buildWorkoutSummaryText } from 'src/modules/assistant/assistant-advice';
import { loadAssistantContext } from 'src/modules/assistant/assistant-context';
import type { CreateWorkoutRequest, ListWorkoutsRequest, UpdateWorkoutRequest, WorkoutParamsRequest } from 'src/modules/workouts/workouts-models';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

/**
 * @constant WORKOUT_DETAIL_SELECT
 * @description The full single-workout shape (entries and sets included) shared by getWorkout and generateWorkoutSummary.
 */
const WORKOUT_DETAIL_SELECT = {
    id: true,
    gymId: true,
    name: true,
    startedAt: true,
    endedAt: true,
    notes: true,
    averageHeartRate: true,
    caloriesBurned: true,
    difficultyRating: true,
    enjoymentRating: true,
    aiSummary: true,
    createdAt: true,
    updatedAt: true,
    gym: { select: { name: true } },
    entries: {
        orderBy: { position: Prisma.SortOrder.asc },
        select: {
            id: true,
            exerciseId: true,
            brandId: true,
            position: true,
            notes: true,
            settings: true,
            supersetId: true,
            createdAt: true,
            exercise: {
                select: { id: true, name: true, primaryMuscle: true, equipment: true }
            },
            sets: {
                orderBy: { setNumber: Prisma.SortOrder.asc },
                select: {
                    id: true,
                    setNumber: true,
                    setType: true,
                    side: true,
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
} as const;

/**
 * @function toTargetWorkout
 * @description Maps a workout loaded with WORKOUT_DETAIL_SELECT into the shape the workout-summary prompt expects, keeping only completed sets.
 *
 * @param {object} workout The loaded workout row.
 * @returns {TargetWorkout} The workout being reviewed, ready for the prompt.
 */
function toTargetWorkout(workout: Prisma.WorkoutGetPayload<{ select: typeof WORKOUT_DETAIL_SELECT }>): TargetWorkout {
    const durationMinutes = workout.endedAt !== null
        ? Math.round((workout.endedAt.getTime() - workout.startedAt.getTime()) / 60000)
        : null;

    const exercises: TargetWorkoutExercise[] = workout.entries.map((entry) => ({
        name: entry.exercise.name,
        sets: entry.sets
            .filter((set) => set.isCompleted)
            .map((set) => ({
                setType: set.setType,
                weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
                reps: set.reps
            }))
    }));

    return {
        name: workout.name,
        date: workout.startedAt.toISOString(),
        gym: workout.gym?.name ?? null,
        durationMinutes,
        difficultyRating: workout.difficultyRating,
        enjoymentRating: workout.enjoymentRating,
        exercises
    };
}

/**
 * @function listWorkouts
 * @description Lists the caller's workouts (summary only) with optional date-range and gym filters and cursor pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listWorkouts(request: FastifyRequest<ListWorkoutsRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const where: Prisma.WorkoutWhereInput = { userId: request.user.id };

    if (request.query.gymId !== undefined) {
        where.gymId = request.query.gymId;
    }
    if (request.query.from !== undefined || request.query.to !== undefined) {
        where.startedAt = { gte: request.query.from, lte: request.query.to };
    }

    const rows = await request.server.prisma.workout.findMany({
        where,
        select: {
            id: true,
            gymId: true,
            name: true,
            startedAt: true,
            endedAt: true,
            notes: true,
            averageHeartRate: true,
            caloriesBurned: true,
            difficultyRating: true,
            enjoymentRating: true,
            aiSummary: true,
            createdAt: true,
            updatedAt: true
        },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        take,
        cursor,
        skip
    });

    reply.status(StatusCodes.OK).send(buildCursorPage(rows, limit));
}

/**
 * @function getWorkout
 * @description Retrieves one of the caller's workouts with its full nested exercise/set tree.
 *
 * @returns {Promise<void>} Resolves when the workout is sent.
 */
async function getWorkout(request: FastifyRequest<WorkoutParamsRequest>, reply: FastifyReply): Promise<void> {
    const workout = await request.server.prisma.workout.findFirst({
        where: { id: request.params.workoutId, userId: request.user.id },
        select: {
            id: true,
            gymId: true,
            name: true,
            startedAt: true,
            endedAt: true,
            notes: true,
            averageHeartRate: true,
            caloriesBurned: true,
            difficultyRating: true,
            enjoymentRating: true,
            aiSummary: true,
            createdAt: true,
            updatedAt: true,
            entries: {
                orderBy: { position: Prisma.SortOrder.asc },
                select: {
                    id: true,
                    exerciseId: true,
                    brandId: true,
                    position: true,
                    notes: true,
                    settings: true,
                    supersetId: true,
                    createdAt: true,
                    exercise: {
                        select: { id: true, name: true, primaryMuscle: true, equipment: true }
                    },
                    sets: {
                        orderBy: { setNumber: Prisma.SortOrder.asc },
                        select: {
                            id: true,
                            setNumber: true,
                            setType: true,
                            side: true,
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

    if (workout === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout not found');
    }

    reply.status(StatusCodes.OK).send({ data: workout });
}

/**
 * @function generateWorkoutSummary
 * @description Generates (or returns the cached) AI recap and advice for one of the caller's finished workouts.
 *
 * @returns {Promise<void>} Resolves when the workout is sent.
 */
async function generateWorkoutSummary(request: FastifyRequest<WorkoutParamsRequest>, reply: FastifyReply): Promise<void> {
    const workout = await request.server.prisma.workout.findFirst({
        where: { id: request.params.workoutId, userId: request.user.id },
        select: WORKOUT_DETAIL_SELECT
    });

    if (workout === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout not found');
    }
    if (workout.endedAt === null) {
        throw new RequestError(StatusCodes.BAD_REQUEST, 'Workout has not been finished yet');
    }
    if (workout.aiSummary !== null) {
        reply.status(StatusCodes.OK).send({ data: workout });
        return;
    }

    const context = await loadAssistantContext(request.server.prisma, request.user.id);
    const aiSummary = await buildWorkoutSummaryText(request.server.ai, context, toTargetWorkout(workout));

    const updated = await request.server.prisma.workout.update({
        where: { id: workout.id },
        data: { aiSummary },
        select: WORKOUT_DETAIL_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function createWorkout
 * @description Starts a workout for the caller (startedAt defaults to now).
 *
 * @returns {Promise<void>} Resolves when the workout is created.
 */
async function createWorkout(request: FastifyRequest<CreateWorkoutRequest>, reply: FastifyReply): Promise<void> {
    if (request.body.gymId !== undefined) {
        const gym = await request.server.prisma.gym.findFirst({ where: { id: request.body.gymId, userId: request.user.id } });

        if (gym === null) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Gym not found');
        }
    }

    const created = await request.server.prisma.workout.create({
        data: {
            userId: request.user.id,
            gymId: request.body.gymId,
            name: request.body.name,
            startedAt: request.body.startedAt ?? new Date(),
            notes: request.body.notes,
            difficultyRating: request.body.difficultyRating,
            enjoymentRating: request.body.enjoymentRating
        },
        select: {
            id: true,
            gymId: true,
            name: true,
            startedAt: true,
            endedAt: true,
            notes: true,
            averageHeartRate: true,
            caloriesBurned: true,
            difficultyRating: true,
            enjoymentRating: true,
            aiSummary: true,
            createdAt: true,
            updatedAt: true
        }
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateWorkout
 * @description Updates one of the caller's workouts. Only provided fields change; a null gymId/endedAt clears it.
 *
 * @returns {Promise<void>} Resolves when the workout is updated.
 */
async function updateWorkout(request: FastifyRequest<UpdateWorkoutRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.workout.findFirst({
        where: { id: request.params.workoutId, userId: request.user.id }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout not found');
    }

    const data: Prisma.WorkoutUncheckedUpdateInput = {};

    if (request.body.name !== undefined) {
        data.name = request.body.name;
    }
    if (request.body.startedAt !== undefined) {
        data.startedAt = request.body.startedAt;
    }
    if (request.body.endedAt !== undefined) {
        data.endedAt = request.body.endedAt;
    }
    if (request.body.notes !== undefined) {
        data.notes = request.body.notes;
    }
    if (request.body.averageHeartRate !== undefined) {
        data.averageHeartRate = request.body.averageHeartRate;
    }

    if (request.body.caloriesBurned !== undefined) {
        data.caloriesBurned = request.body.caloriesBurned;
    }
    if (request.body.difficultyRating !== undefined) {
        data.difficultyRating = request.body.difficultyRating;
    }
    if (request.body.enjoymentRating !== undefined) {
        data.enjoymentRating = request.body.enjoymentRating;
    }
    if (request.body.gymId !== undefined) {
        if (request.body.gymId !== null) {
            const gym = await request.server.prisma.gym.findFirst({ where: { id: request.body.gymId, userId: request.user.id } });

            if (gym === null) {
                throw new RequestError(StatusCodes.NOT_FOUND, 'Gym not found');
            }
        }
        data.gymId = request.body.gymId;
    }

    const updated = await request.server.prisma.workout.update({
        where: { id: request.params.workoutId },
        data,
        select: {
            id: true,
            gymId: true,
            name: true,
            startedAt: true,
            endedAt: true,
            notes: true,
            averageHeartRate: true,
            caloriesBurned: true,
            difficultyRating: true,
            enjoymentRating: true,
            aiSummary: true,
            createdAt: true,
            updatedAt: true
        }
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteWorkout
 * @description Removes one of the caller's workouts (its exercises and sets cascade away).
 *
 * @returns {Promise<void>} Resolves when the workout is deleted.
 */
async function deleteWorkout(request: FastifyRequest<WorkoutParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.workout.findFirst({
        where: { id: request.params.workoutId, userId: request.user.id }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout not found');
    }

    await request.server.prisma.$transaction([
        request.server.prisma.workout.delete({ where: { id: request.params.workoutId } }),
        request.server.prisma.syncDeletion.create({
            data: { userId: request.user.id, entityType: SyncEntityType.WORKOUT, entityId: request.params.workoutId }
        })
    ]);

    reply.status(StatusCodes.OK).send({ data: { message: 'Workout deleted' } });
}

export default {
    listWorkouts,
    getWorkout,
    generateWorkoutSummary,
    createWorkout,
    updateWorkout,
    deleteWorkout
};
