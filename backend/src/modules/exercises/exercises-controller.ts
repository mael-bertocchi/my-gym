import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateExerciseRequest, ExerciseParamsRequest, ListExercisesRequest, UpdateExerciseRequest } from 'src/modules/exercises/exercises-models';
import { RequestError } from 'src/shared/models';
import { buildPaginationMeta, parsePagination, type PaginatedResponse } from 'src/shared/pagination';

/**
 * @constant EXERCISE_SELECT
 * @description Shared field selection for exercise lookups exposed by the API.
 */
const EXERCISE_SELECT = {
    id: true,
    name: true,
    primaryMuscle: true,
    secondaryMuscles: true,
    isArchived: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.ExerciseSelect;

/**
 * @function listExercises
 * @description Lists the user's exercises with optional search and pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listExercises(request: FastifyRequest<ListExercisesRequest>, reply: FastifyReply): Promise<void> {
    const { page, pageSize, skip, take } = parsePagination(request.query);

    const where: Prisma.ExerciseWhereInput = { userId: request.user.id };

    if (request.query.search !== undefined && request.query.search.trim().length !== 0) {
        where.name = { contains: request.query.search.trim(), mode: 'insensitive' };
    }

    const [total, rows] = await Promise.all([
        request.server.prisma.exercise.count({ where }),
        request.server.prisma.exercise.findMany({ where, select: EXERCISE_SELECT, orderBy: { name: 'asc' }, skip, take })
    ]);

    const pagination = buildPaginationMeta(total, pageSize, page);

    let data = rows;
    if (total !== 0 && pagination.page !== page) {
        data = await request.server.prisma.exercise.findMany({
            where,
            select: EXERCISE_SELECT,
            orderBy: { name: 'asc' },
            skip: (pagination.page - 1) * pageSize,
            take
        });
    }

    const body: PaginatedResponse<typeof data[number]> = { data, pagination };

    reply.status(StatusCodes.OK).send(body);
}

/**
 * @function getExercise
 * @description Retrieves a single exercise owned by the user.
 *
 * @returns {Promise<void>} Resolves when the exercise is sent.
 */
async function getExercise(request: FastifyRequest<ExerciseParamsRequest>, reply: FastifyReply): Promise<void> {
    const exercise = await request.server.prisma.exercise.findFirst({
        where: { id: request.params.id, userId: request.user.id },
        select: EXERCISE_SELECT
    });

    if (exercise === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise not found');
    }

    reply.status(StatusCodes.OK).send({ data: exercise });
}

/**
 * @function createExercise
 * @description Creates an exercise (movement) for the user.
 *
 * @returns {Promise<void>} Resolves when the exercise is created.
 */
async function createExercise(request: FastifyRequest<CreateExerciseRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exercise.findFirst({
        where: { userId: request.user.id, name: request.body.name }
    });

    if (existing !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'An exercise with this name already exists');
    }

    const created = await request.server.prisma.exercise.create({
        data: {
            userId: request.user.id,
            name: request.body.name,
            primaryMuscle: request.body.primaryMuscle,
            secondaryMuscles: request.body.secondaryMuscles
        },
        select: EXERCISE_SELECT
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateExercise
 * @description Updates an exercise owned by the user. Only the provided fields change.
 *
 * @returns {Promise<void>} Resolves when the exercise is updated.
 */
async function updateExercise(request: FastifyRequest<UpdateExerciseRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exercise.findFirst({
        where: { id: request.params.id, userId: request.user.id }
    });

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

    const data: Prisma.ExerciseUpdateInput = {};

    if (request.body.name !== undefined) {
        data.name = request.body.name;
    }
    if (request.body.primaryMuscle !== undefined) {
        data.primaryMuscle = request.body.primaryMuscle;
    }
    if (request.body.secondaryMuscles !== undefined) {
        data.secondaryMuscles = request.body.secondaryMuscles;
    }
    if (request.body.isArchived !== undefined) {
        data.isArchived = request.body.isArchived;
    }

    const updated = await request.server.prisma.exercise.update({
        where: { id: request.params.id },
        data,
        select: EXERCISE_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteExercise
 * @description Removes an exercise owned by the user (its variants cascade away).
 *
 * @returns {Promise<void>} Resolves when the exercise is deleted.
 */
async function deleteExercise(request: FastifyRequest<ExerciseParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exercise.findFirst({
        where: { id: request.params.id, userId: request.user.id }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise not found');
    }

    await request.server.prisma.exercise.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Exercise deleted' } });
}

export default {
    listExercises,
    getExercise,
    createExercise,
    updateExercise,
    deleteExercise
};
