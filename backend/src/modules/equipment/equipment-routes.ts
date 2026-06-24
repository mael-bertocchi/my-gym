import type { FastifyInstance } from 'fastify';
import equipmentController from 'src/modules/equipment/equipment-controller';
import type { CreateEquipmentRequest, EquipmentParamsRequest, ListEquipmentRequest, UpdateEquipmentRequest } from 'src/modules/equipment/equipment-models';
import { CreateEquipmentSchema, ListEquipmentQuerySchema, UpdateEquipmentSchema } from 'src/modules/equipment/equipment-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function equipmentRoutes
 * @description Defines the equipment catalog routes (authenticated reads, administrator writes).
 */
export default function (fastify: FastifyInstance): void {
    const administrator = [fastify.authentication.authenticate, fastify.authentication.authorizeAdministrator];

    fastify.get<ListEquipmentRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListEquipmentQuerySchema
        }
    }, equipmentController.listEquipment);

    fastify.get<EquipmentParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, equipmentController.getEquipment);

    fastify.post<CreateEquipmentRequest>('/', {
        preHandler: administrator,
        schema: {
            body: CreateEquipmentSchema
        }
    }, equipmentController.createEquipment);

    fastify.patch<UpdateEquipmentRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema,
            body: UpdateEquipmentSchema
        }
    }, equipmentController.updateEquipment);

    fastify.delete<EquipmentParamsRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema
        }
    }, equipmentController.deleteEquipment);
}
