import type { RequestGenericInterface } from 'fastify';
import { CursorQuerySchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant ListBrandsQuerySchema
 * @description Zod schema for the list-brands query string (cursor pagination plus an optional name search).
 */
export const ListBrandsQuerySchema = CursorQuerySchema.extend({
    search: z.string().max(200).optional()
});

/**
 * @constant CreateBrandSchema
 * @description Zod schema for the create-brand request body.
 */
export const CreateBrandSchema = z.object({
    name: z.string().min(1).max(120)
});

/**
 * @type CreateBrandBody
 * @description Inferred body type for the create-brand endpoint.
 */
export type CreateBrandBody = z.infer<typeof CreateBrandSchema>;

/**
 * @constant UpdateBrandSchema
 * @description Zod schema for the update-brand request body.
 */
export const UpdateBrandSchema = z.object({
    name: z.string().min(1).max(120)
});

/**
 * @type UpdateBrandBody
 * @description Inferred body type for the update-brand endpoint.
 */
export type UpdateBrandBody = z.infer<typeof UpdateBrandSchema>;

/**
 * @interface ListBrandsRequest
 * @description Fastify request generic for listing brands with search + cursor pagination.
 *
 * @extends RequestGenericInterface
 */
export interface ListBrandsRequest extends RequestGenericInterface {
    Querystring: {
        search?: string; /*!< Optional case-insensitive search across the brand name */
        limit?: number; /*!< Optional page size (1..MAX_LIMIT) */
        cursor?: string; /*!< Optional id of the previous page's last item */
    };
}

/**
 * @interface CreateBrandRequest
 * @description Fastify request generic for creating a brand.
 *
 * @extends RequestGenericInterface
 */
export interface CreateBrandRequest extends RequestGenericInterface {
    Body: CreateBrandBody; /*!< Validated create-brand body */
}

/**
 * @interface UpdateBrandRequest
 * @description Fastify request generic for updating a brand.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateBrandRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Brand identifier */
    };
    Body: UpdateBrandBody; /*!< Validated update-brand body */
}

/**
 * @interface BrandParamsRequest
 * @description Fastify request generic for operations targeting a single brand by id.
 *
 * @extends RequestGenericInterface
 */
export interface BrandParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Brand identifier */
    };
}
