import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateGymRequest, GymParamsRequest, ListGymsRequest, UpdateGymRequest } from 'src/modules/gyms/gyms-models';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

/**
 * @function listGyms
 * @description Lists the caller's gyms with optional search and cursor pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listGyms(request: FastifyRequest<ListGymsRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const where: Prisma.GymWhereInput = { userId: request.user.id };

    if (request.query.search !== undefined && request.query.search.trim().length !== 0) {
        where.name = { contains: request.query.search.trim(), mode: 'insensitive' };
    }

    const rows = await request.server.prisma.gym.findMany({
        where,
        select: {
            id: true,
            name: true,
            address: true,
            notes: true,
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
 * @function getGym
 * @description Retrieves one of the caller's gyms.
 *
 * @returns {Promise<void>} Resolves when the gym is sent.
 */
async function getGym(request: FastifyRequest<GymParamsRequest>, reply: FastifyReply): Promise<void> {
    const gym = await request.server.prisma.gym.findFirst({
        where: { id: request.params.id, userId: request.user.id },
        select: {
            id: true,
            name: true,
            address: true,
            notes: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (gym === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym not found');
    }

    reply.status(StatusCodes.OK).send({ data: gym });
}

/**
 * @function createGym
 * @description Creates a gym owned by the caller.
 *
 * @returns {Promise<void>} Resolves when the gym is created.
 */
async function createGym(request: FastifyRequest<CreateGymRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.gym.findUnique({ where: { userId_name: { userId: request.user.id, name: request.body.name } } });

    if (existing !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'A gym with this name already exists');
    }

    const created = await request.server.prisma.gym.create({
        data: {
            userId: request.user.id,
            name: request.body.name,
            address: request.body.address,
            notes: request.body.notes
        },
        select: {
            id: true,
            name: true,
            address: true,
            notes: true,
            createdAt: true,
            updatedAt: true
        }
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateGym
 * @description Updates a gym. Only the provided fields change; a null address/notes clears it.
 *
 * @returns {Promise<void>} Resolves when the gym is updated.
 */
async function updateGym(request: FastifyRequest<UpdateGymRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.gym.findFirst({ where: { id: request.params.id, userId: request.user.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym not found');
    }

    if (request.body.name !== undefined) {
        const duplicate = await request.server.prisma.gym.findFirst({
            where: { userId: request.user.id, name: request.body.name, id: { not: request.params.id } }
        });

        if (duplicate !== null) {
            throw new RequestError(StatusCodes.CONFLICT, 'A gym with this name already exists');
        }
    }

    const data: Prisma.GymUpdateInput = {};

    if (request.body.name !== undefined) {
        data.name = request.body.name;
    }
    if (request.body.address !== undefined) {
        data.address = request.body.address;
    }
    if (request.body.notes !== undefined) {
        data.notes = request.body.notes;
    }

    const updated = await request.server.prisma.gym.update({
        where: { id: request.params.id },
        data,
        select: {
            id: true,
            name: true,
            address: true,
            notes: true,
            createdAt: true,
            updatedAt: true
        }
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteGym
 * @description Removes a gym; existing workouts keep their history with the gym cleared.
 *
 * @returns {Promise<void>} Resolves when the gym is deleted.
 */
async function deleteGym(request: FastifyRequest<GymParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.gym.findFirst({ where: { id: request.params.id, userId: request.user.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym not found');
    }

    await request.server.prisma.gym.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Gym deleted' } });
}

export default {
    listGyms,
    getGym,
    createGym,
    updateGym,
    deleteGym
};
