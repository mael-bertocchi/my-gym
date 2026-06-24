import type { RequestGenericInterface } from 'fastify';
import { CursorQuerySchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant ListGymsQuerySchema
 * @description Zod schema for the list-gyms query string (cursor pagination plus an optional name search).
 */
export const ListGymsQuerySchema = CursorQuerySchema.extend({
    search: z.string().max(200).optional()
});

/**
 * @constant CreateGymSchema
 * @description Zod schema for the create-gym request body.
 */
export const CreateGymSchema = z.object({
    name: z.string().min(1).max(120),
    address: z.string().min(1).max(200).optional(),
    notes: z.string().max(2000).optional()
});

/**
 * @type CreateGymBody
 * @description Inferred body type for the create-gym endpoint.
 */
export type CreateGymBody = z.infer<typeof CreateGymSchema>;

/**
 * @constant UpdateGymSchema
 * @description Zod schema for the update-gym request body. Each field is optional, but at least one must be provided. A null address/notes clears that field.
 */
export const UpdateGymSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    address: z.string().min(1).max(200).nullable().optional(),
    notes: z.string().max(2000).nullable().optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateGymBody
 * @description Inferred body type for the update-gym endpoint.
 */
export type UpdateGymBody = z.infer<typeof UpdateGymSchema>;

/**
 * @interface ListGymsRequest
 * @description Fastify request generic for listing gyms with search + cursor pagination.
 *
 * @extends RequestGenericInterface
 */
export interface ListGymsRequest extends RequestGenericInterface {
    Querystring: {
        search?: string; /*!< Optional case-insensitive search across the gym name */
        limit?: number; /*!< Optional page size (1..MAX_LIMIT) */
        cursor?: string; /*!< Optional id of the previous page's last item */
    };
}

/**
 * @interface CreateGymRequest
 * @description Fastify request generic for creating a gym.
 *
 * @extends RequestGenericInterface
 */
export interface CreateGymRequest extends RequestGenericInterface {
    Body: CreateGymBody; /*!< Validated create-gym body */
}

/**
 * @interface UpdateGymRequest
 * @description Fastify request generic for updating a gym.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateGymRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Gym identifier */
    };
    Body: UpdateGymBody; /*!< Validated update-gym body */
}

/**
 * @interface GymParamsRequest
 * @description Fastify request generic for operations targeting a single gym by id.
 *
 * @extends RequestGenericInterface
 */
export interface GymParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Gym identifier */
    };
}
