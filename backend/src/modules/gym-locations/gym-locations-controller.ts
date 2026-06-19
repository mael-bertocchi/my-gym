import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateGymLocationRequest, GymLocationParamsRequest, ListGymLocationsRequest, UpdateGymLocationRequest } from 'src/modules/gym-locations/gym-locations-models';
import { RequestError } from 'src/shared/models';
import { buildPaginationMeta, parsePagination, type PaginatedResponse } from 'src/shared/pagination';

/**
 * @constant GYM_LOCATION_SELECT
 * @description Shared field selection for gym location lookups exposed by the API.
 */
const GYM_LOCATION_SELECT = {
    id: true,
    gymBrandId: true,
    name: true,
    city: true,
    address: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.GymLocationSelect;

/**
 * @function listGymLocations
 * @description Lists the user's gym locations, optionally filtered by brand, with search and pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listGymLocations(request: FastifyRequest<ListGymLocationsRequest>, reply: FastifyReply): Promise<void> {
    const { page, pageSize, skip, take } = parsePagination(request.query);

    const where: Prisma.GymLocationWhereInput = { gymBrand: { userId: request.user.id } };

    if (request.query.gymBrandId !== undefined) {
        where.gymBrandId = request.query.gymBrandId;
    }

    if (request.query.search !== undefined && request.query.search.trim().length > 0) {
        where.name = { contains: request.query.search.trim(), mode: 'insensitive' };
    }

    const [total, rows] = await Promise.all([
        request.server.prisma.gymLocation.count({ where }),
        request.server.prisma.gymLocation.findMany({ where, select: GYM_LOCATION_SELECT, orderBy: { name: 'asc' }, skip, take })
    ]);

    const pagination = buildPaginationMeta(total, pageSize, page);

    let data = rows;
    if (total > 0 && pagination.page !== page) {
        data = await request.server.prisma.gymLocation.findMany({
            where,
            select: GYM_LOCATION_SELECT,
            orderBy: { name: 'asc' },
            skip: (pagination.page - 1) * pageSize,
            take
        });
    }

    const body: PaginatedResponse<typeof data[number]> = { data, pagination };

    reply.status(StatusCodes.OK).send(body);
}

/**
 * @function getGymLocation
 * @description Retrieves a single gym location owned by the user (via its brand).
 *
 * @returns {Promise<void>} Resolves when the location is sent.
 */
async function getGymLocation(request: FastifyRequest<GymLocationParamsRequest>, reply: FastifyReply): Promise<void> {
    const location = await request.server.prisma.gymLocation.findFirst({
        where: { id: request.params.id, gymBrand: { userId: request.user.id } },
        select: GYM_LOCATION_SELECT
    });

    if (location === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym location not found');
    }

    reply.status(StatusCodes.OK).send({ data: location });
}

/**
 * @function createGymLocation
 * @description Creates a gym location under one of the user's brands.
 *
 * @returns {Promise<void>} Resolves when the location is created.
 */
async function createGymLocation(request: FastifyRequest<CreateGymLocationRequest>, reply: FastifyReply): Promise<void> {
    const brand = await request.server.prisma.gymBrand.findFirst({
        where: { id: request.body.gymBrandId, userId: request.user.id }
    });

    if (brand === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym brand not found');
    }

    const duplicate = await request.server.prisma.gymLocation.findFirst({
        where: { gymBrandId: request.body.gymBrandId, name: request.body.name }
    });

    if (duplicate !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'A location with this name already exists for this brand');
    }

    const created = await request.server.prisma.gymLocation.create({
        data: {
            gymBrandId: request.body.gymBrandId,
            name: request.body.name,
            city: request.body.city,
            address: request.body.address
        },
        select: GYM_LOCATION_SELECT
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateGymLocation
 * @description Updates a gym location owned by the user. Only the provided fields change.
 *
 * @returns {Promise<void>} Resolves when the location is updated.
 */
async function updateGymLocation(request: FastifyRequest<UpdateGymLocationRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.gymLocation.findFirst({
        where: { id: request.params.id, gymBrand: { userId: request.user.id } }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym location not found');
    }

    if (request.body.name !== undefined) {
        const duplicate = await request.server.prisma.gymLocation.findFirst({
            where: { gymBrandId: existing.gymBrandId, name: request.body.name, id: { not: request.params.id } }
        });

        if (duplicate !== null) {
            throw new RequestError(StatusCodes.CONFLICT, 'A location with this name already exists for this brand');
        }
    }

    const data: Prisma.GymLocationUpdateInput = {};

    if (request.body.name !== undefined) {
        data.name = request.body.name;
    }
    if (request.body.city !== undefined) {
        data.city = request.body.city;
    }
    if (request.body.address !== undefined) {
        data.address = request.body.address;
    }

    const updated = await request.server.prisma.gymLocation.update({
        where: { id: request.params.id },
        data,
        select: GYM_LOCATION_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteGymLocation
 * @description Removes a gym location owned by the user.
 *
 * @returns {Promise<void>} Resolves when the location is deleted.
 */
async function deleteGymLocation(request: FastifyRequest<GymLocationParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.gymLocation.findFirst({
        where: { id: request.params.id, gymBrand: { userId: request.user.id } }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym location not found');
    }

    await request.server.prisma.gymLocation.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Gym location deleted' } });
}

export default {
    listGymLocations,
    getGymLocation,
    createGymLocation,
    updateGymLocation,
    deleteGymLocation
};
