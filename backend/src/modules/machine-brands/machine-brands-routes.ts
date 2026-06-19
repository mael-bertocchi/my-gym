import type { FastifyInstance } from 'fastify';
import machineBrandsController from 'src/modules/machine-brands/machine-brands-controller';
import type { CreateMachineBrandRequest, ListMachineBrandsRequest, MachineBrandParamsRequest, UpdateMachineBrandRequest } from 'src/modules/machine-brands/machine-brands-models';
import { CreateMachineBrandSchema, UpdateMachineBrandSchema } from 'src/modules/machine-brands/machine-brands-models';
import { PaginationQuerySchema, UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function machineBrandsRoutes
 * @description Defines the routes for managing the user's machine brands.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<ListMachineBrandsRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: PaginationQuerySchema
        }
    }, machineBrandsController.listMachineBrands);

    fastify.get<MachineBrandParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, machineBrandsController.getMachineBrand);

    fastify.post<CreateMachineBrandRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: CreateMachineBrandSchema
        }
    }, machineBrandsController.createMachineBrand);

    fastify.patch<UpdateMachineBrandRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            body: UpdateMachineBrandSchema
        }
    }, machineBrandsController.updateMachineBrand);

    fastify.delete<MachineBrandParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, machineBrandsController.deleteMachineBrand);
}
