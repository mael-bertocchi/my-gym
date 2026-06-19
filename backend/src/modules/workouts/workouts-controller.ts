import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { Prisma } from 'prisma/generated/prisma/client';
import type { CreateWorkoutRequest, ListWorkoutsRequest, UpdateWorkoutRequest, WorkoutParamsRequest } from 'src/modules/workouts/workouts-models';
import { RequestError } from 'src/shared/models';
import { buildPaginationMeta, parsePagination, type PaginatedResponse } from 'src/shared/pagination';

/**
 * @constant WORKOUT_SUMMARY_SELECT
 * @description Field selection for workout list/create/update responses (no nested entries).
 */
const WORKOUT_SUMMARY_SELECT = {
    id: true,
    gymLocationId: true,
    name: true,
    startedAt: true,
    endedAt: true,
    notes: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.WorkoutSelect;

/**
 * @constant WORKOUT_DETAIL_SELECT
 * @description Field selection for a single workout, including its ordered exercises (with variant context) and their sets.
 */
const WORKOUT_DETAIL_SELECT = {
    id: true,
    gymLocationId: true,
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
            exerciseVariantId: true,
            position: true,
            notes: true,
            createdAt: true,
            exerciseVariant: {
                select: {
                    id: true,
                    equipmentType: true,
                    machineBrandId: true,
                    exercise: {
                        select: { id: true, name: true, primaryMuscle: true }
                    }
                }
            },
            sets: {
                orderBy: { setNumber: Prisma.SortOrder.asc },
                select: {
                    id: true,
                    setNumber: true,
                    setType: true,
                    weightKg: true,
                    reps: true,
                    rpe: true,
                    restSeconds: true,
                    durationSeconds: true,
                    tempo: true,
                    notes: true,
                    isCompleted: true,
                    createdAt: true
                }
            }
        }
    }
} satisfies Prisma.WorkoutSelect;

/**
 * @function listWorkouts
 * @description Lists the user's workouts (summary only) with an optional location filter and pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listWorkouts(request: FastifyRequest<ListWorkoutsRequest>, reply: FastifyReply): Promise<void> {
    const { page, pageSize, skip, take } = parsePagination(request.query);

    const where: Prisma.WorkoutWhereInput = { userId: request.user.id };

    if (request.query.gymLocationId !== undefined) {
        where.gymLocationId = request.query.gymLocationId;
    }

    const [total, rows] = await Promise.all([
        request.server.prisma.workout.count({ where }),
        request.server.prisma.workout.findMany({ where, select: WORKOUT_SUMMARY_SELECT, orderBy: { startedAt: 'desc' }, skip, take })
    ]);

    const pagination = buildPaginationMeta(total, pageSize, page);

    let data = rows;
    if (total > 0 && pagination.page !== page) {
        data = await request.server.prisma.workout.findMany({
            where,
            select: WORKOUT_SUMMARY_SELECT,
            orderBy: { startedAt: 'desc' },
            skip: (pagination.page - 1) * pageSize,
            take
        });
    }

    const body: PaginatedResponse<typeof data[number]> = { data, pagination };

    reply.status(StatusCodes.OK).send(body);
}

/**
 * @function getWorkout
 * @description Retrieves a single workout owned by the user, with its full nested exercise/set tree.
 *
 * @returns {Promise<void>} Resolves when the workout is sent.
 */
async function getWorkout(request: FastifyRequest<WorkoutParamsRequest>, reply: FastifyReply): Promise<void> {
    const workout = await request.server.prisma.workout.findFirst({
        where: { id: request.params.id, userId: request.user.id },
        select: WORKOUT_DETAIL_SELECT
    });

    if (workout === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout not found');
    }

    reply.status(StatusCodes.OK).send({ data: workout });
}

/**
 * @function createWorkout
 * @description Creates a workout for the user (startedAt defaults to now).
 *
 * @returns {Promise<void>} Resolves when the workout is created.
 */
async function createWorkout(request: FastifyRequest<CreateWorkoutRequest>, reply: FastifyReply): Promise<void> {
    if (request.body.gymLocationId !== undefined) {
        const location = await request.server.prisma.gymLocation.findFirst({
            where: { id: request.body.gymLocationId, gymBrand: { userId: request.user.id } }
        });

        if (location === null) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Gym location not found');
        }
    }

    const created = await request.server.prisma.workout.create({
        data: {
            userId: request.user.id,
            gymLocationId: request.body.gymLocationId,
            name: request.body.name,
            startedAt: request.body.startedAt ?? new Date(),
            notes: request.body.notes
        },
        select: WORKOUT_SUMMARY_SELECT
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateWorkout
 * @description Updates a workout owned by the user. Only provided fields change; a null gymLocationId/endedAt clears it.
 *
 * @returns {Promise<void>} Resolves when the workout is updated.
 */
async function updateWorkout(request: FastifyRequest<UpdateWorkoutRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.workout.findFirst({
        where: { id: request.params.id, userId: request.user.id }
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
    if (request.body.gymLocationId !== undefined) {
        if (request.body.gymLocationId !== null) {
            const location = await request.server.prisma.gymLocation.findFirst({
                where: { id: request.body.gymLocationId, gymBrand: { userId: request.user.id } }
            });

            if (location === null) {
                throw new RequestError(StatusCodes.NOT_FOUND, 'Gym location not found');
            }
        }
        data.gymLocationId = request.body.gymLocationId;
    }

    const updated = await request.server.prisma.workout.update({
        where: { id: request.params.id },
        data,
        select: WORKOUT_SUMMARY_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteWorkout
 * @description Removes a workout owned by the user (its exercises and sets cascade away).
 *
 * @returns {Promise<void>} Resolves when the workout is deleted.
 */
async function deleteWorkout(request: FastifyRequest<WorkoutParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.workout.findFirst({
        where: { id: request.params.id, userId: request.user.id }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout not found');
    }

    await request.server.prisma.workout.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Workout deleted' } });
}

export default {
    listWorkouts,
    getWorkout,
    createWorkout,
    updateWorkout,
    deleteWorkout
};
