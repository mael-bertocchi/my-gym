import type { RequestGenericInterface } from 'fastify';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from 'src/shared/pagination';
import { z } from 'zod';

/**
 * @constant CreateGymLocationSchema
 * @description Zod schema for the create-gym-location request body.
 */
export const CreateGymLocationSchema = z.object({
    gymBrandId: z.uuid(),
    name: z.string().min(1).max(120),
    city: z.string().min(1).max(120).optional(),
    address: z.string().min(1).max(200).optional()
});

/**
 * @type CreateGymLocationBody
 * @description Inferred body type for the create-gym-location endpoint.
 */
export type CreateGymLocationBody = z.infer<typeof CreateGymLocationSchema>;

/**
 * @constant UpdateGymLocationSchema
 * @description Zod schema for the update-gym-location request body. Each field is optional, but at least one must be provided.
 */
export const UpdateGymLocationSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    city: z.string().min(1).max(120).optional(),
    address: z.string().min(1).max(200).optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateGymLocationBody
 * @description Inferred body type for the update-gym-location endpoint.
 */
export type UpdateGymLocationBody = z.infer<typeof UpdateGymLocationSchema>;

/**
 * @constant ListGymLocationsQuerySchema
 * @description Zod schema for the list-locations query string (pagination, optional brand filter, optional name search).
 */
export const ListGymLocationsQuerySchema = z.object({
    gymBrandId: z.uuid().optional(),
    search: z.string().max(200).optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().refine(value => PAGE_SIZES.includes(value), {
        message: `Page size must be one of ${PAGE_SIZES.join(', ')}`
    }).optional().default(DEFAULT_PAGE_SIZE)
});

/**
 * @interface ListGymLocationsRequest
 * @description Fastify request generic for listing gym locations.
 *
 * @extends RequestGenericInterface
 */
export interface ListGymLocationsRequest extends RequestGenericInterface {
    Querystring: {
        gymBrandId?: string; /*!< Optional brand filter */
        search?: string; /*!< Optional case-insensitive search across the location name */
        page?: number; /*!< Optional 1-based page number */
        pageSize?: number; /*!< Optional page size (must be one of PAGE_SIZES) */
    };
}

/**
 * @interface CreateGymLocationRequest
 * @description Fastify request generic for creating a gym location.
 *
 * @extends RequestGenericInterface
 */
export interface CreateGymLocationRequest extends RequestGenericInterface {
    Body: CreateGymLocationBody; /*!< Validated create-gym-location body */
}

/**
 * @interface UpdateGymLocationRequest
 * @description Fastify request generic for updating a gym location.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateGymLocationRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Gym location identifier */
    };
    Body: UpdateGymLocationBody; /*!< Validated update-gym-location body */
}

/**
 * @interface GymLocationParamsRequest
 * @description Fastify request generic for operations targeting a single gym location by id.
 *
 * @extends RequestGenericInterface
 */
export interface GymLocationParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Gym location identifier */
    };
}
