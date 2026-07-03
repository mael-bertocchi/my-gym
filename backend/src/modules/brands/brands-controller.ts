import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { BrandParamsRequest, CreateBrandRequest, ListBrandsRequest, UpdateBrandRequest } from 'src/modules/brands/brands-models';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

/**
 * @function listBrands
 * @description Lists brands with optional search and cursor pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listBrands(request: FastifyRequest<ListBrandsRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const where: Prisma.BrandWhereInput = {};

    if (request.query.search !== undefined && request.query.search.trim().length !== 0) {
        where.name = { contains: request.query.search.trim(), mode: 'insensitive' };
    }

    const rows = await request.server.prisma.brand.findMany({
        where,
        select: {
            id: true,
            name: true,
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
 * @function getBrand
 * @description Retrieves a single brand.
 *
 * @returns {Promise<void>} Resolves when the brand is sent.
 */
async function getBrand(request: FastifyRequest<BrandParamsRequest>, reply: FastifyReply): Promise<void> {
    const brand = await request.server.prisma.brand.findUnique({
        where: { id: request.params.id },
        select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (brand === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Brand not found');
    }

    reply.status(StatusCodes.OK).send({ data: brand });
}

/**
 * @function createBrand
 * @description Creates a brand.
 *
 * @returns {Promise<void>} Resolves when the brand is created.
 */
async function createBrand(request: FastifyRequest<CreateBrandRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.brand.findUnique({ where: { name: request.body.name } });

    if (existing !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'A brand with this name already exists');
    }

    const created = await request.server.prisma.brand.create({
        data: { name: request.body.name },
        select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true
        }
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateBrand
 * @description Renames a brand.
 *
 * @returns {Promise<void>} Resolves when the brand is updated.
 */
async function updateBrand(request: FastifyRequest<UpdateBrandRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.brand.findUnique({ where: { id: request.params.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Brand not found');
    }

    const duplicate = await request.server.prisma.brand.findFirst({
        where: { name: request.body.name, id: { not: request.params.id } }
    });

    if (duplicate !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'A brand with this name already exists');
    }

    const updated = await request.server.prisma.brand.update({
        where: { id: request.params.id },
        data: { name: request.body.name },
        select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true
        }
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteBrand
 * @description Removes a brand, unless exercises reference it.
 *
 * @returns {Promise<void>} Resolves when the brand is deleted.
 */
async function deleteBrand(request: FastifyRequest<BrandParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.brand.findUnique({ where: { id: request.params.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Brand not found');
    }

    const referenceCount = await request.server.prisma.exercise.count({ where: { brandId: request.params.id } });

    if (referenceCount !== 0) {
        throw new RequestError(StatusCodes.CONFLICT, 'Brand is referenced by one or more exercises');
    }

    await request.server.prisma.brand.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Brand deleted' } });
}

export default {
    listBrands,
    getBrand,
    createBrand,
    updateBrand,
    deleteBrand
};
