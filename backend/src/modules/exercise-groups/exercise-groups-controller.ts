import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { Prisma } from 'prisma/generated/prisma/client';
import type { CreateExerciseGroupRequest, ExerciseGroupParamsRequest, ListExerciseGroupsRequest, UpdateExerciseGroupRequest } from 'src/modules/exercise-groups/exercise-groups-models';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

/**
 * @constant EXERCISE_GROUP_SELECT
 * @description Shared field selection for group list/create/update responses (no members).
 */
const EXERCISE_GROUP_SELECT = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.ExerciseGroupSelect;

/**
 * @constant EXERCISE_GROUP_DETAIL_SELECT
 * @description Field selection for a single group, including its member exercises.
 */
const EXERCISE_GROUP_DETAIL_SELECT = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
    exercises: {
        orderBy: { name: Prisma.SortOrder.asc },
        select: {
            id: true,
            name: true,
            primaryMuscle: true,
            secondaryMuscles: true,
            equipmentId: true,
            isFavorite: true,
            isArchived: true
        }
    }
} satisfies Prisma.ExerciseGroupSelect;

/**
 * @function listExerciseGroups
 * @description Lists exercise groups with optional search and cursor pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listExerciseGroups(request: FastifyRequest<ListExerciseGroupsRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const where: Prisma.ExerciseGroupWhereInput = {};

    if (request.query.search !== undefined && request.query.search.trim().length !== 0) {
        where.name = { contains: request.query.search.trim(), mode: 'insensitive' };
    }

    const rows = await request.server.prisma.exerciseGroup.findMany({
        where,
        select: EXERCISE_GROUP_SELECT,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take,
        cursor,
        skip
    });

    reply.status(StatusCodes.OK).send(buildCursorPage(rows, limit));
}

/**
 * @function getExerciseGroup
 * @description Retrieves a single exercise group with its member exercises.
 *
 * @returns {Promise<void>} Resolves when the group is sent.
 */
async function getExerciseGroup(request: FastifyRequest<ExerciseGroupParamsRequest>, reply: FastifyReply): Promise<void> {
    const group = await request.server.prisma.exerciseGroup.findUnique({
        where: { id: request.params.id },
        select: EXERCISE_GROUP_DETAIL_SELECT
    });

    if (group === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise group not found');
    }

    reply.status(StatusCodes.OK).send({ data: group });
}

/**
 * @function createExerciseGroup
 * @description Creates an exercise group.
 *
 * @returns {Promise<void>} Resolves when the group is created.
 */
async function createExerciseGroup(request: FastifyRequest<CreateExerciseGroupRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exerciseGroup.findUnique({ where: { name: request.body.name } });

    if (existing !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'An exercise group with this name already exists');
    }

    const created = await request.server.prisma.exerciseGroup.create({
        data: { name: request.body.name },
        select: EXERCISE_GROUP_SELECT
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateExerciseGroup
 * @description Renames an exercise group.
 *
 * @returns {Promise<void>} Resolves when the group is updated.
 */
async function updateExerciseGroup(request: FastifyRequest<UpdateExerciseGroupRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exerciseGroup.findUnique({ where: { id: request.params.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise group not found');
    }

    const duplicate = await request.server.prisma.exerciseGroup.findFirst({
        where: { name: request.body.name, id: { not: request.params.id } }
    });

    if (duplicate !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'An exercise group with this name already exists');
    }

    const updated = await request.server.prisma.exerciseGroup.update({
        where: { id: request.params.id },
        data: { name: request.body.name },
        select: EXERCISE_GROUP_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteExerciseGroup
 * @description Removes an exercise group; its member exercises are detached (groupId cleared).
 *
 * @returns {Promise<void>} Resolves when the group is deleted.
 */
async function deleteExerciseGroup(request: FastifyRequest<ExerciseGroupParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exerciseGroup.findUnique({ where: { id: request.params.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise group not found');
    }

    await request.server.prisma.exerciseGroup.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Exercise group deleted' } });
}

export default {
    listExerciseGroups,
    getExerciseGroup,
    createExerciseGroup,
    updateExerciseGroup,
    deleteExerciseGroup
};
