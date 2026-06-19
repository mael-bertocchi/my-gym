import type { RequestGenericInterface } from 'fastify';
import { z } from 'zod';

/**
 * @constant CreateMachineBrandSchema
 * @description Zod schema for the create-machine-brand request body.
 */
export const CreateMachineBrandSchema = z.object({
    name: z.string().min(1).max(120)
});

/**
 * @type CreateMachineBrandBody
 * @description Inferred body type for the create-machine-brand endpoint.
 */
export type CreateMachineBrandBody = z.infer<typeof CreateMachineBrandSchema>;

/**
 * @constant UpdateMachineBrandSchema
 * @description Zod schema for the update-machine-brand request body.
 */
export const UpdateMachineBrandSchema = z.object({
    name: z.string().min(1).max(120)
});

/**
 * @type UpdateMachineBrandBody
 * @description Inferred body type for the update-machine-brand endpoint.
 */
export type UpdateMachineBrandBody = z.infer<typeof UpdateMachineBrandSchema>;

/**
 * @interface ListMachineBrandsRequest
 * @description Fastify request generic for listing machine brands with search + pagination.
 *
 * @extends RequestGenericInterface
 */
export interface ListMachineBrandsRequest extends RequestGenericInterface {
    Querystring: {
        search?: string; /*!< Optional case-insensitive search across the brand name */
        page?: number; /*!< Optional 1-based page number */
        pageSize?: number; /*!< Optional page size (must be one of PAGE_SIZES) */
    };
}

/**
 * @interface CreateMachineBrandRequest
 * @description Fastify request generic for creating a machine brand.
 *
 * @extends RequestGenericInterface
 */
export interface CreateMachineBrandRequest extends RequestGenericInterface {
    Body: CreateMachineBrandBody; /*!< Validated create-machine-brand body */
}

/**
 * @interface UpdateMachineBrandRequest
 * @description Fastify request generic for updating a machine brand.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateMachineBrandRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Machine brand identifier */
    };
    Body: UpdateMachineBrandBody; /*!< Validated update-machine-brand body */
}

/**
 * @interface MachineBrandParamsRequest
 * @description Fastify request generic for operations targeting a single machine brand by id.
 *
 * @extends RequestGenericInterface
 */
export interface MachineBrandParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Machine brand identifier */
    };
}
