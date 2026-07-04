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
 * @description Lists the caller's exercises with group/equipment/brand/muscle/name filters and cursor pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listExercises(request: FastifyRequest<ListExercisesRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const where: Prisma.ExerciseWhereInput = { userId: request.user.id };

    if (request.query.groupId !== undefined) {
        where.groupId = request.query.groupId;
    }
    if (request.query.equipment !== undefined) {
        where.equipment = request.query.equipment;
    }
    if (request.query.brandId !== undefined) {
        where.brandId = request.query.brandId;
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
            brandId: true,
            groupId: true,
            isFavorite: true,
            isArchived: true,
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
            brandId: true,
            groupId: true,
            isFavorite: true,
            isArchived: true,
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
 * @description Creates an exercise owned by the caller, optionally linked to one of their brands and movement groups.
 *
 * @returns {Promise<void>} Resolves when the exercise is created.
 */
async function createExercise(request: FastifyRequest<CreateExerciseRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exercise.findUnique({ where: { userId_name: { userId: request.user.id, name: request.body.name } } });

    if (existing !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'An exercise with this name already exists');
    }

    if (request.body.brandId !== undefined) {
        const brand = await request.server.prisma.brand.findFirst({ where: { id: request.body.brandId, userId: request.user.id } });

        if (brand === null) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Brand not found');
        }
    }
    if (request.body.groupId !== undefined) {
        const group = await request.server.prisma.exerciseGroup.findFirst({ where: { id: request.body.groupId, userId: request.user.id } });

        if (group === null) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise group not found');
        }
    }

    const created = await request.server.prisma.exercise.create({
        data: {
            userId: request.user.id,
            name: request.body.name,
            primaryMuscle: request.body.primaryMuscle,
            secondaryMuscles: request.body.secondaryMuscles,
            equipment: request.body.equipment,
            brandId: request.body.brandId,
            groupId: request.body.groupId
        },
        select: {
            id: true,
            name: true,
            primaryMuscle: true,
            secondaryMuscles: true,
            equipment: true,
            brandId: true,
            groupId: true,
            isFavorite: true,
            isArchived: true,
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
    if (request.body.brandId !== undefined && request.body.brandId !== null) {
        const brand = await request.server.prisma.brand.findFirst({ where: { id: request.body.brandId, userId: request.user.id } });

        if (brand === null) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Brand not found');
        }
    }
    if (request.body.groupId !== undefined && request.body.groupId !== null) {
        const group = await request.server.prisma.exerciseGroup.findFirst({ where: { id: request.body.groupId, userId: request.user.id } });

        if (group === null) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise group not found');
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
    if (request.body.brandId !== undefined) {
        data.brandId = request.body.brandId;
    }
    if (request.body.groupId !== undefined) {
        data.groupId = request.body.groupId;
    }
    if (request.body.isFavorite !== undefined) {
        data.isFavorite = request.body.isFavorite;
    }
    if (request.body.isArchived !== undefined) {
        data.isArchived = request.body.isArchived;
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
            brandId: true,
            groupId: true,
            isFavorite: true,
            isArchived: true,
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
 * @description Returns the caller's PRs, estimated 1RM, and per-session progression for an exercise.
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
