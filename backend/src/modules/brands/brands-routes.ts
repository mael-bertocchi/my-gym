import type { FastifyInstance } from 'fastify';
import brandsController from 'src/modules/brands/brands-controller';
import type { BrandParamsRequest, CreateBrandRequest, ListBrandsRequest, UpdateBrandRequest } from 'src/modules/brands/brands-models';
import { CreateBrandSchema, ListBrandsQuerySchema, UpdateBrandSchema } from 'src/modules/brands/brands-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function brandsRoutes
 * @description Defines the caller's personal brand catalog routes.
 */
export default function (fastify: FastifyInstance): void {
    const authenticated = [fastify.authentication.authenticate];

    fastify.get<ListBrandsRequest>('/', {
        preHandler: authenticated,
        schema: {
            querystring: ListBrandsQuerySchema
        }
    }, brandsController.listBrands);

    fastify.get<BrandParamsRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema
        }
    }, brandsController.getBrand);

    fastify.post<CreateBrandRequest>('/', {
        preHandler: authenticated,
        schema: {
            body: CreateBrandSchema
        }
    }, brandsController.createBrand);

    fastify.patch<UpdateBrandRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema,
            body: UpdateBrandSchema
        }
    }, brandsController.updateBrand);

    fastify.delete<BrandParamsRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema
        }
    }, brandsController.deleteBrand);
}
