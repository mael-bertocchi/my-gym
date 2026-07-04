import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { Prisma, SyncEntityType } from 'prisma/generated/prisma/client';
import type { CreateWorkoutRequest, ListWorkoutsRequest, UpdateWorkoutRequest, WorkoutParamsRequest } from 'src/modules/workouts/workouts-models';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

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
                    exercise: {
                        select: { id: true, name: true, primaryMuscle: true, equipment: true, brandId: true, groupId: true }
                    },
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

    if (workout === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout not found');
    }

    reply.status(StatusCodes.OK).send({ data: workout });
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
            notes: request.body.notes
        },
        select: {
            id: true,
            gymId: true,
            name: true,
            startedAt: true,
            endedAt: true,
            notes: true,
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
    createWorkout,
    updateWorkout,
    deleteWorkout
};
