import type { FastifyInstance } from 'fastify';
import gymBrandsController from 'src/modules/gym-brands/gym-brands-controller';
import type { CreateGymBrandRequest, GymBrandParamsRequest, ListGymBrandsRequest, UpdateGymBrandRequest } from 'src/modules/gym-brands/gym-brands-models';
import { CreateGymBrandSchema, UpdateGymBrandSchema } from 'src/modules/gym-brands/gym-brands-models';
import { PaginationQuerySchema, UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function gymBrandsRoutes
 * @description Defines the routes for managing the user's gym brands.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<ListGymBrandsRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: PaginationQuerySchema
        }
    }, gymBrandsController.listGymBrands);

    fastify.get<GymBrandParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, gymBrandsController.getGymBrand);

    fastify.post<CreateGymBrandRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: CreateGymBrandSchema
        }
    }, gymBrandsController.createGymBrand);

    fastify.patch<UpdateGymBrandRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            body: UpdateGymBrandSchema
        }
    }, gymBrandsController.updateGymBrand);

    fastify.delete<GymBrandParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, gymBrandsController.deleteGymBrand);
}
