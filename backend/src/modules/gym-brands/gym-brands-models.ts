import type { RequestGenericInterface } from 'fastify';
import { z } from 'zod';

/**
 * @constant CreateGymBrandSchema
 * @description Zod schema for the create-gym-brand request body.
 */
export const CreateGymBrandSchema = z.object({
    name: z.string().min(1).max(120)
});

/**
 * @type CreateGymBrandBody
 * @description Inferred body type for the create-gym-brand endpoint.
 */
export type CreateGymBrandBody = z.infer<typeof CreateGymBrandSchema>;

/**
 * @constant UpdateGymBrandSchema
 * @description Zod schema for the update-gym-brand request body.
 */
export const UpdateGymBrandSchema = z.object({
    name: z.string().min(1).max(120)
});

/**
 * @type UpdateGymBrandBody
 * @description Inferred body type for the update-gym-brand endpoint.
 */
export type UpdateGymBrandBody = z.infer<typeof UpdateGymBrandSchema>;

/**
 * @interface ListGymBrandsRequest
 * @description Fastify request generic for listing gym brands with search + pagination.
 *
 * @extends RequestGenericInterface
 */
export interface ListGymBrandsRequest extends RequestGenericInterface {
    Querystring: {
        search?: string; /*!< Optional case-insensitive search across the brand name */
        page?: number; /*!< Optional 1-based page number */
        pageSize?: number; /*!< Optional page size (must be one of PAGE_SIZES) */
    };
}

/**
 * @interface CreateGymBrandRequest
 * @description Fastify request generic for creating a gym brand.
 *
 * @extends RequestGenericInterface
 */
export interface CreateGymBrandRequest extends RequestGenericInterface {
    Body: CreateGymBrandBody; /*!< Validated create-gym-brand body */
}

/**
 * @interface UpdateGymBrandRequest
 * @description Fastify request generic for updating a gym brand.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateGymBrandRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Gym brand identifier */
    };
    Body: UpdateGymBrandBody; /*!< Validated update-gym-brand body */
}

/**
 * @interface GymBrandParamsRequest
 * @description Fastify request generic for operations targeting a single gym brand by id.
 *
 * @extends RequestGenericInterface
 */
export interface GymBrandParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Gym brand identifier */
    };
}
