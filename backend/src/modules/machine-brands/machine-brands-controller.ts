import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateMachineBrandRequest, ListMachineBrandsRequest, MachineBrandParamsRequest, UpdateMachineBrandRequest } from 'src/modules/machine-brands/machine-brands-models';
import { RequestError } from 'src/shared/models';
import { buildPaginationMeta, parsePagination, type PaginatedResponse } from 'src/shared/pagination';

/**
 * @constant MACHINE_BRAND_SELECT
 * @description Shared field selection for machine brand lookups exposed by the API.
 */
const MACHINE_BRAND_SELECT = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.MachineBrandSelect;

/**
 * @function listMachineBrands
 * @description Lists the user's machine brands with optional search and pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listMachineBrands(request: FastifyRequest<ListMachineBrandsRequest>, reply: FastifyReply): Promise<void> {
    const { page, pageSize, skip, take } = parsePagination(request.query);

    const where: Prisma.MachineBrandWhereInput = { userId: request.user.id };

    if (request.query.search !== undefined && request.query.search.trim().length !== 0) {
        where.name = { contains: request.query.search.trim(), mode: 'insensitive' };
    }

    const [total, rows] = await Promise.all([
        request.server.prisma.machineBrand.count({ where }),
        request.server.prisma.machineBrand.findMany({ where, select: MACHINE_BRAND_SELECT, orderBy: { name: 'asc' }, skip, take })
    ]);

    const pagination = buildPaginationMeta(total, pageSize, page);

    let data = rows;
    if (total !== 0 && pagination.page !== page) {
        data = await request.server.prisma.machineBrand.findMany({
            where,
            select: MACHINE_BRAND_SELECT,
            orderBy: { name: 'asc' },
            skip: (pagination.page - 1) * pageSize,
            take
        });
    }

    const body: PaginatedResponse<typeof data[number]> = { data, pagination };

    reply.status(StatusCodes.OK).send(body);
}

/**
 * @function getMachineBrand
 * @description Retrieves a single machine brand owned by the user.
 *
 * @returns {Promise<void>} Resolves when the brand is sent.
 */
async function getMachineBrand(request: FastifyRequest<MachineBrandParamsRequest>, reply: FastifyReply): Promise<void> {
    const brand = await request.server.prisma.machineBrand.findFirst({
        where: { id: request.params.id, userId: request.user.id },
        select: MACHINE_BRAND_SELECT
    });

    if (brand === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Machine brand not found');
    }

    reply.status(StatusCodes.OK).send({ data: brand });
}

/**
 * @function createMachineBrand
 * @description Creates a machine brand for the user.
 *
 * @returns {Promise<void>} Resolves when the brand is created.
 */
async function createMachineBrand(request: FastifyRequest<CreateMachineBrandRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.machineBrand.findFirst({
        where: { userId: request.user.id, name: request.body.name }
    });

    if (existing !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'A machine brand with this name already exists');
    }

    const created = await request.server.prisma.machineBrand.create({
        data: { userId: request.user.id, name: request.body.name },
        select: MACHINE_BRAND_SELECT
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateMachineBrand
 * @description Renames a machine brand owned by the user.
 *
 * @returns {Promise<void>} Resolves when the brand is updated.
 */
async function updateMachineBrand(request: FastifyRequest<UpdateMachineBrandRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.machineBrand.findFirst({
        where: { id: request.params.id, userId: request.user.id }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Machine brand not found');
    }

    const duplicate = await request.server.prisma.machineBrand.findFirst({
        where: { userId: request.user.id, name: request.body.name, id: { not: request.params.id } }
    });

    if (duplicate !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'A machine brand with this name already exists');
    }

    const updated = await request.server.prisma.machineBrand.update({
        where: { id: request.params.id },
        data: { name: request.body.name },
        select: MACHINE_BRAND_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteMachineBrand
 * @description Removes a machine brand owned by the user, unless variants reference it.
 *
 * @returns {Promise<void>} Resolves when the brand is deleted.
 */
async function deleteMachineBrand(request: FastifyRequest<MachineBrandParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.machineBrand.findFirst({
        where: { id: request.params.id, userId: request.user.id }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Machine brand not found');
    }

    const referenceCount = await request.server.prisma.exerciseVariant.count({
        where: { machineBrandId: request.params.id }
    });

    if (referenceCount !== 0) {
        throw new RequestError(StatusCodes.CONFLICT, 'Machine brand is referenced by one or more exercise variants');
    }

    await request.server.prisma.machineBrand.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Machine brand deleted' } });
}

export default {
    listMachineBrands,
    getMachineBrand,
    createMachineBrand,
    updateMachineBrand,
    deleteMachineBrand
};
