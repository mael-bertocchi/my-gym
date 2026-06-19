import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateGymBrandRequest, GymBrandParamsRequest, ListGymBrandsRequest, UpdateGymBrandRequest } from 'src/modules/gym-brands/gym-brands-models';
import { RequestError } from 'src/shared/models';
import { buildPaginationMeta, parsePagination, type PaginatedResponse } from 'src/shared/pagination';

/**
 * @constant GYM_BRAND_SELECT
 * @description Shared field selection for gym brand lookups exposed by the API.
 */
const GYM_BRAND_SELECT = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.GymBrandSelect;

/**
 * @function listGymBrands
 * @description Lists the user's gym brands with optional search and pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listGymBrands(request: FastifyRequest<ListGymBrandsRequest>, reply: FastifyReply): Promise<void> {
    const { page, pageSize, skip, take } = parsePagination(request.query);

    const where: Prisma.GymBrandWhereInput = { userId: request.user.id };

    if (request.query.search && request.query.search.trim().length > 0) {
        where.name = { contains: request.query.search.trim(), mode: 'insensitive' };
    }

    const [total, rows] = await Promise.all([
        request.server.prisma.gymBrand.count({ where }),
        request.server.prisma.gymBrand.findMany({ where, select: GYM_BRAND_SELECT, orderBy: { name: 'asc' }, skip, take })
    ]);

    const pagination = buildPaginationMeta(total, pageSize, page);

    let data = rows;
    if (total > 0 && pagination.page !== page) {
        data = await request.server.prisma.gymBrand.findMany({
            where,
            select: GYM_BRAND_SELECT,
            orderBy: { name: 'asc' },
            skip: (pagination.page - 1) * pageSize,
            take
        });
    }

    const body: PaginatedResponse<typeof data[number]> = { data, pagination };

    reply.status(StatusCodes.OK).send(body);
}

/**
 * @function getGymBrand
 * @description Retrieves a single gym brand owned by the user.
 *
 * @returns {Promise<void>} Resolves when the brand is sent.
 */
async function getGymBrand(request: FastifyRequest<GymBrandParamsRequest>, reply: FastifyReply): Promise<void> {
    const brand = await request.server.prisma.gymBrand.findFirst({
        where: { id: request.params.id, userId: request.user.id },
        select: GYM_BRAND_SELECT
    });

    if (brand === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym brand not found');
    }

    reply.status(StatusCodes.OK).send({ data: brand });
}

/**
 * @function createGymBrand
 * @description Creates a gym brand for the user.
 *
 * @returns {Promise<void>} Resolves when the brand is created.
 */
async function createGymBrand(request: FastifyRequest<CreateGymBrandRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.gymBrand.findFirst({
        where: { userId: request.user.id, name: request.body.name }
    });

    if (existing !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'A gym brand with this name already exists');
    }

    const created = await request.server.prisma.gymBrand.create({
        data: { userId: request.user.id, name: request.body.name },
        select: GYM_BRAND_SELECT
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateGymBrand
 * @description Renames a gym brand owned by the user.
 *
 * @returns {Promise<void>} Resolves when the brand is updated.
 */
async function updateGymBrand(request: FastifyRequest<UpdateGymBrandRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.gymBrand.findFirst({
        where: { id: request.params.id, userId: request.user.id }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym brand not found');
    }

    const duplicate = await request.server.prisma.gymBrand.findFirst({
        where: { userId: request.user.id, name: request.body.name, id: { not: request.params.id } }
    });

    if (duplicate !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'A gym brand with this name already exists');
    }

    const updated = await request.server.prisma.gymBrand.update({
        where: { id: request.params.id },
        data: { name: request.body.name },
        select: GYM_BRAND_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteGymBrand
 * @description Removes a gym brand owned by the user, unless locations reference it.
 *
 * @returns {Promise<void>} Resolves when the brand is deleted.
 */
async function deleteGymBrand(request: FastifyRequest<GymBrandParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.gymBrand.findFirst({
        where: { id: request.params.id, userId: request.user.id }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym brand not found');
    }

    const referenceCount = await request.server.prisma.gymLocation.count({
        where: { gymBrandId: request.params.id }
    });

    if (referenceCount > 0) {
        throw new RequestError(StatusCodes.CONFLICT, 'Gym brand is referenced by one or more gym locations');
    }

    await request.server.prisma.gymBrand.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Gym brand deleted' } });
}

export default {
    listGymBrands,
    getGymBrand,
    createGymBrand,
    updateGymBrand,
    deleteGymBrand
};
