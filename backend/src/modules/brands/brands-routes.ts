import type { FastifyInstance } from 'fastify';
import brandsController from 'src/modules/brands/brands-controller';
import type { BrandParamsRequest, CreateBrandRequest, ListBrandsRequest, UpdateBrandRequest } from 'src/modules/brands/brands-models';
import { CreateBrandSchema, ListBrandsQuerySchema, UpdateBrandSchema } from 'src/modules/brands/brands-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function brandsRoutes
 * @description Defines the brand catalog routes (authenticated reads, administrator writes).
 */
export default function (fastify: FastifyInstance): void {
    const administrator = [fastify.authentication.authenticate, fastify.authentication.authorizeAdministrator];

    fastify.get<ListBrandsRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListBrandsQuerySchema
        }
    }, brandsController.listBrands);

    fastify.get<BrandParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, brandsController.getBrand);

    fastify.post<CreateBrandRequest>('/', {
        preHandler: administrator,
        schema: {
            body: CreateBrandSchema
        }
    }, brandsController.createBrand);

    fastify.patch<UpdateBrandRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema,
            body: UpdateBrandSchema
        }
    }, brandsController.updateBrand);

    fastify.delete<BrandParamsRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema
        }
    }, brandsController.deleteBrand);
}
