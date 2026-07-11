import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateExerciseRequest, ExerciseLastRequest, ExerciseParamsRequest, ExerciseRangeRequest, ListExercisesRequest, UpdateExerciseRequest } from 'src/modules/exercises/exercises-models';
import { computeExerciseStats } from 'src/modules/stats/stats-compute';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

/**
 * @function ensureExercise
 * @description Loads one of the caller's exercises by id or throws a 404. Used by the per-user sub-routes.
 *
 * @param {FastifyRequest} request The request, used to reach prisma and the caller.
 * @param {string} id The exercise id.
 * @returns {Promise<void>} Resolves when the exercise exists.
 */
async function ensureExercise(request: FastifyRequest, id: string): Promise<void> {
    const exercise = await request.server.prisma.exercise.findFirst({ where: { id, userId: request.user.id }, select: { id: true } });

    if (exercise === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise not found');
    }
}

/**
 * @function listExercises
 * @description Lists the caller's exercises with equipment/muscle/name filters and cursor pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listExercises(request: FastifyRequest<ListExercisesRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const where: Prisma.ExerciseWhereInput = { userId: request.user.id };

    if (request.query.equipment !== undefined) {
        where.equipment = request.query.equipment;
    }
    if (request.query.muscle !== undefined) {
        where.OR = [
            { primaryMuscle: request.query.muscle },
            { secondaryMuscles: { has: request.query.muscle } }
        ];
    }
    if (request.query.q !== undefined && request.query.q.trim().length !== 0) {
        where.name = { contains: request.query.q.trim(), mode: 'insensitive' };
    }

    const rows = await request.server.prisma.exercise.findMany({
        where,
        select: {
            id: true,
            name: true,
            primaryMuscle: true,
            secondaryMuscles: true,
            equipment: true,
            isFavorite: true,
            isArchived: true,
            isUnilateral: true,
            isWeighted: true,
            brandMode: true,
            brandId: true,
            createdAt: true,
            updatedAt: true
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take,
        cursor,
        skip
    });

    reply.status(StatusCodes.OK).send(buildCursorPage(rows, limit));
}

/**
 * @function getExercise
 * @description Retrieves one of the caller's exercises.
 *
 * @returns {Promise<void>} Resolves when the exercise is sent.
 */
async function getExercise(request: FastifyRequest<ExerciseParamsRequest>, reply: FastifyReply): Promise<void> {
    const exercise = await request.server.prisma.exercise.findFirst({
        where: { id: request.params.id, userId: request.user.id },
        select: {
            id: true,
            name: true,
            primaryMuscle: true,
            secondaryMuscles: true,
            equipment: true,
            isFavorite: true,
            isArchived: true,
            isUnilateral: true,
            isWeighted: true,
            brandMode: true,
            brandId: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (exercise === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise not found');
    }

    reply.status(StatusCodes.OK).send({ data: exercise });
}

/**
 * @function createExercise
 * @description Creates an exercise owned by the caller.
 *
 * @returns {Promise<void>} Resolves when the exercise is created.
 */
async function createExercise(request: FastifyRequest<CreateExerciseRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exercise.findUnique({ where: { userId_name: { userId: request.user.id, name: request.body.name } } });

    if (existing !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'An exercise with this name already exists');
    }

    if (request.body.brandId !== undefined && request.body.brandId !== null) {
        const brand = await request.server.prisma.brand.findFirst({ where: { id: request.body.brandId, userId: request.user.id }, select: { id: true } });

        if (brand === null) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Brand not found');
        }
    }

    const created = await request.server.prisma.exercise.create({
        data: {
            userId: request.user.id,
            name: request.body.name,
            primaryMuscle: request.body.primaryMuscle,
            secondaryMuscles: request.body.secondaryMuscles,
            equipment: request.body.equipment,
            isUnilateral: request.body.isUnilateral,
            isWeighted: request.body.isWeighted,
            brandMode: request.body.brandMode,
            brandId: request.body.brandId ?? null
        },
        select: {
            id: true,
            name: true,
            primaryMuscle: true,
            secondaryMuscles: true,
            equipment: true,
            isFavorite: true,
            isArchived: true,
            isUnilateral: true,
            isWeighted: true,
            brandMode: true,
            brandId: true,
            createdAt: true,
            updatedAt: true
        }
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateExercise
 * @description Updates an exercise. Only the provided fields change.
 *
 * @returns {Promise<void>} Resolves when the exercise is updated.
 */
async function updateExercise(request: FastifyRequest<UpdateExerciseRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exercise.findFirst({ where: { id: request.params.id, userId: request.user.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise not found');
    }

    if (request.body.name !== undefined) {
        const duplicate = await request.server.prisma.exercise.findFirst({
            where: { userId: request.user.id, name: request.body.name, id: { not: request.params.id } }
        });

        if (duplicate !== null) {
            throw new RequestError(StatusCodes.CONFLICT, 'An exercise with this name already exists');
        }
    }

    const data: Prisma.ExerciseUncheckedUpdateInput = {};

    if (request.body.name !== undefined) {
        data.name = request.body.name;
    }
    if (request.body.primaryMuscle !== undefined) {
        data.primaryMuscle = request.body.primaryMuscle;
    }
    if (request.body.secondaryMuscles !== undefined) {
        data.secondaryMuscles = request.body.secondaryMuscles;
    }
    if (request.body.equipment !== undefined) {
        data.equipment = request.body.equipment;
    }
    if (request.body.isFavorite !== undefined) {
        data.isFavorite = request.body.isFavorite;
    }
    if (request.body.isArchived !== undefined) {
        data.isArchived = request.body.isArchived;
    }
    if (request.body.isUnilateral !== undefined) {
        data.isUnilateral = request.body.isUnilateral;
    }
    if (request.body.isWeighted !== undefined) {
        data.isWeighted = request.body.isWeighted;
    }

    const brandMode = request.body.brandMode ?? existing.brandMode;
    const effectiveBrandId = request.body.brandId !== undefined ? request.body.brandId : existing.brandId;

    if (brandMode === 'SINGLE' && effectiveBrandId === null) {
        throw new RequestError(StatusCodes.BAD_REQUEST, 'A branded exercise requires a brandId');
    }
    if (brandMode !== 'SINGLE' && request.body.brandId !== undefined && request.body.brandId !== null) {
        throw new RequestError(StatusCodes.BAD_REQUEST, 'brandId can only be set when brandMode is SINGLE');
    }
    if (request.body.brandId !== undefined && request.body.brandId !== null) {
        const brand = await request.server.prisma.brand.findFirst({ where: { id: request.body.brandId, userId: request.user.id }, select: { id: true } });

        if (brand === null) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Brand not found');
        }
    }

    if (request.body.brandMode !== undefined) {
        data.brandMode = request.body.brandMode;

        if (request.body.brandMode !== 'SINGLE') {
            data.brandId = null;
        }
    }
    if (request.body.brandId !== undefined) {
        data.brandId = request.body.brandId;
    }

    const updated = await request.server.prisma.exercise.update({
        where: { id: request.params.id },
        data,
        select: {
            id: true,
            name: true,
            primaryMuscle: true,
            secondaryMuscles: true,
            equipment: true,
            isFavorite: true,
            isArchived: true,
            isUnilateral: true,
            isWeighted: true,
            brandMode: true,
            brandId: true,
            createdAt: true,
            updatedAt: true
        }
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteExercise
 * @description Removes an exercise, unless it has been logged in a workout.
 *
 * @returns {Promise<void>} Resolves when the exercise is deleted.
 */
async function deleteExercise(request: FastifyRequest<ExerciseParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exercise.findFirst({ where: { id: request.params.id, userId: request.user.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise not found');
    }

    const referenceCount = await request.server.prisma.workoutExercise.count({ where: { exerciseId: request.params.id } });

    if (referenceCount !== 0) {
        throw new RequestError(StatusCodes.CONFLICT, 'Exercise has logged history and cannot be deleted; archive it instead');
    }

    await request.server.prisma.exercise.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Exercise deleted' } });
}

/**
 * @function getExerciseHistory
 * @description Returns the caller's logged sessions for an exercise, most recent first.
 *
 * @returns {Promise<void>} Resolves when the history is sent.
 */
async function getExerciseHistory(request: FastifyRequest<ExerciseRangeRequest>, reply: FastifyReply): Promise<void> {
    await ensureExercise(request, request.params.id);

    const workoutFilter: Prisma.WorkoutWhereInput = { userId: request.user.id };

    if (request.query.gymId !== undefined) {
        workoutFilter.gymId = request.query.gymId;
    }
    if (request.query.from !== undefined || request.query.to !== undefined) {
        workoutFilter.startedAt = { gte: request.query.from, lte: request.query.to };
    }

    const entries = await request.server.prisma.workoutExercise.findMany({
        where: { exerciseId: request.params.id, workout: workoutFilter },
        select: {
            id: true,
            notes: true,
            workout: { select: { id: true, startedAt: true, gymId: true } },
            sets: {
                orderBy: { setNumber: 'asc' }, select: {
                    id: true,
                    setNumber: true,
                    setType: true,
                    side: true,
                    weightKg: true,
                    reps: true,
                    distanceM: true,
                    durationSeconds: true,
                    isCompleted: true
                }
            }
        },
        orderBy: { workout: { startedAt: 'desc' } }
    });

    const sessions = entries.map((entry) => ({
        workoutExerciseId: entry.id,
        workoutId: entry.workout.id,
        date: entry.workout.startedAt,
        gymId: entry.workout.gymId,
        notes: entry.notes,
        sets: entry.sets
    }));

    reply.status(StatusCodes.OK).send({ data: { exerciseId: request.params.id, sessions } });
}

/**
 * @function getExerciseStats
 * @description Returns the caller's personal records, estimated 1RM, and per-session progression for an exercise.
 *
 * @returns {Promise<void>} Resolves when the stats are sent.
 */
async function getExerciseStats(request: FastifyRequest<ExerciseRangeRequest>, reply: FastifyReply): Promise<void> {
    await ensureExercise(request, request.params.id);

    const where: Prisma.WorkoutWhereInput = {
        userId: request.user.id,
        entries: { some: { exerciseId: request.params.id } }
    };

    if (request.query.gymId !== undefined) {
        where.gymId = request.query.gymId;
    }
    if (request.query.from !== undefined || request.query.to !== undefined) {
        where.startedAt = { gte: request.query.from, lte: request.query.to };
    }

    const workouts = await request.server.prisma.workout.findMany({
        where,
        select: {
            startedAt: true,
            entries: {
                where: { exerciseId: request.params.id },
                select: {
                    sets: {
                        where: { setType: 'NORMAL' },
                        select: { weightKg: true, reps: true }
                    }
                }
            }
        },
        orderBy: { startedAt: 'asc' }
    });

    const sessions = workouts.map((workout) => ({
        date: workout.startedAt.toISOString(),
        sets: workout.entries.flatMap((entry) => entry.sets.map((set) => ({
            weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
            reps: set.reps
        })))
    }));

    const stats = computeExerciseStats(sessions);

    reply.status(StatusCodes.OK).send({ data: { exerciseId: request.params.id, ...stats } });
}

/**
 * @function getExerciseLast
 * @description Returns the caller's most recent sets for an exercise plus the remembered settings, for pre-fill.
 *
 * @returns {Promise<void>} Resolves when the pre-fill payload is sent.
 */
async function getExerciseLast(request: FastifyRequest<ExerciseLastRequest>, reply: FastifyReply): Promise<void> {
    await ensureExercise(request, request.params.id);

    const workoutFilter: Prisma.WorkoutWhereInput = { userId: request.user.id };

    if (request.query.gymId !== undefined) {
        workoutFilter.gymId = request.query.gymId;
    }

    const last = await request.server.prisma.workoutExercise.findFirst({
        where: { exerciseId: request.params.id, workout: workoutFilter },
        select: {
            id: true,
            notes: true,
            workout: { select: { id: true, startedAt: true, gymId: true } },
            sets: {
                orderBy: { setNumber: 'asc' }, select: {
                    id: true,
                    setNumber: true,
                    setType: true,
                    side: true,
                    weightKg: true,
                    reps: true,
                    distanceM: true,
                    durationSeconds: true,
                    isCompleted: true
                }
            }
        },
        orderBy: { workout: { startedAt: 'desc' } }
    });

    const setting = await request.server.prisma.exerciseSetting.findUnique({
        where: { userId_exerciseId: { userId: request.user.id, exerciseId: request.params.id } },
        select: { settings: true }
    });

    const settings: Prisma.JsonValue = setting !== null ? setting.settings : null;

    const lastSession = last !== null
        ? { workoutExerciseId: last.id, workoutId: last.workout.id, date: last.workout.startedAt, gymId: last.workout.gymId, notes: last.notes, sets: last.sets }
        : null;

    reply.status(StatusCodes.OK).send({ data: { exerciseId: request.params.id, last: lastSession, settings } });
}

export default {
    listExercises,
    getExercise,
    createExercise,
    updateExercise,
    deleteExercise,
    getExerciseHistory,
    getExerciseStats,
    getExerciseLast
};
