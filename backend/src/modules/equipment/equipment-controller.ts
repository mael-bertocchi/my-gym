import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateEquipmentRequest, EquipmentParamsRequest, ListEquipmentRequest, UpdateEquipmentRequest } from 'src/modules/equipment/equipment-models';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

/**
 * @constant EQUIPMENT_SELECT
 * @description Shared field selection for equipment lookups exposed by the API.
 */
const EQUIPMENT_SELECT = {
    id: true,
    name: true,
    type: true,
    brandId: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.EquipmentSelect;

/**
 * @function listEquipment
 * @description Lists equipment with optional brand/type/name filters and cursor pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listEquipment(request: FastifyRequest<ListEquipmentRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const where: Prisma.EquipmentWhereInput = {};

    if (request.query.brandId !== undefined) {
        where.brandId = request.query.brandId;
    }
    if (request.query.type !== undefined) {
        where.type = request.query.type;
    }
    if (request.query.search !== undefined && request.query.search.trim().length !== 0) {
        where.name = { contains: request.query.search.trim(), mode: 'insensitive' };
    }

    const rows = await request.server.prisma.equipment.findMany({
        where,
        select: EQUIPMENT_SELECT,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take,
        cursor,
        skip
    });

    reply.status(StatusCodes.OK).send(buildCursorPage(rows, limit));
}

/**
 * @function getEquipment
 * @description Retrieves a single piece of equipment.
 *
 * @returns {Promise<void>} Resolves when the equipment is sent.
 */
async function getEquipment(request: FastifyRequest<EquipmentParamsRequest>, reply: FastifyReply): Promise<void> {
    const equipment = await request.server.prisma.equipment.findUnique({
        where: { id: request.params.id },
        select: EQUIPMENT_SELECT
    });

    if (equipment === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Equipment not found');
    }

    reply.status(StatusCodes.OK).send({ data: equipment });
}

/**
 * @function createEquipment
 * @description Creates a piece of equipment, optionally tied to a brand.
 *
 * @returns {Promise<void>} Resolves when the equipment is created.
 */
async function createEquipment(request: FastifyRequest<CreateEquipmentRequest>, reply: FastifyReply): Promise<void> {
    if (request.body.brandId !== undefined) {
        const brand = await request.server.prisma.brand.findUnique({ where: { id: request.body.brandId } });

        if (brand === null) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Brand not found');
        }
    }

    const created = await request.server.prisma.equipment.create({
        data: {
            name: request.body.name,
            type: request.body.type,
            brandId: request.body.brandId
        },
        select: EQUIPMENT_SELECT
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateEquipment
 * @description Updates a piece of equipment. Only the provided fields change.
 *
 * @returns {Promise<void>} Resolves when the equipment is updated.
 */
async function updateEquipment(request: FastifyRequest<UpdateEquipmentRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.equipment.findUnique({ where: { id: request.params.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Equipment not found');
    }

    const data: Prisma.EquipmentUncheckedUpdateInput = {};

    if (request.body.name !== undefined) {
        data.name = request.body.name;
    }
    if (request.body.type !== undefined) {
        data.type = request.body.type;
    }
    if (request.body.brandId !== undefined) {
        if (request.body.brandId !== null) {
            const brand = await request.server.prisma.brand.findUnique({ where: { id: request.body.brandId } });

            if (brand === null) {
                throw new RequestError(StatusCodes.NOT_FOUND, 'Brand not found');
            }
        }
        data.brandId = request.body.brandId;
    }

    const updated = await request.server.prisma.equipment.update({
        where: { id: request.params.id },
        data,
        select: EQUIPMENT_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteEquipment
 * @description Removes a piece of equipment, unless exercises reference it.
 *
 * @returns {Promise<void>} Resolves when the equipment is deleted.
 */
async function deleteEquipment(request: FastifyRequest<EquipmentParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.equipment.findUnique({ where: { id: request.params.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Equipment not found');
    }

    const referenceCount = await request.server.prisma.exercise.count({ where: { equipmentId: request.params.id } });

    if (referenceCount !== 0) {
        throw new RequestError(StatusCodes.CONFLICT, 'Equipment is referenced by one or more exercises');
    }

    await request.server.prisma.equipment.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Equipment deleted' } });
}

export default {
    listEquipment,
    getEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment
};
