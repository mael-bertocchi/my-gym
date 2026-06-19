import type { RequestGenericInterface } from 'fastify';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from 'src/shared/pagination';
import { z } from 'zod';

/**
 * @constant CreateWorkoutSchema
 * @description Zod schema for the create-workout request body. All fields are optional; startedAt defaults to now in the controller.
 */
export const CreateWorkoutSchema = z.object({
    gymLocationId: z.uuid().optional(),
    name: z.string().min(1).max(120).optional(),
    startedAt: z.coerce.date().optional(),
    notes: z.string().max(2000).optional()
});

/**
 * @type CreateWorkoutBody
 * @description Inferred body type for the create-workout endpoint.
 */
export type CreateWorkoutBody = z.infer<typeof CreateWorkoutSchema>;

/**
 * @constant UpdateWorkoutSchema
 * @description Zod schema for the update-workout request body. Each field is optional, but at least one must be provided. A null gymLocationId/endedAt clears that field.
 */
export const UpdateWorkoutSchema = z.object({
    gymLocationId: z.uuid().nullable().optional(),
    name: z.string().min(1).max(120).optional(),
    startedAt: z.coerce.date().optional(),
    endedAt: z.coerce.date().nullable().optional(),
    notes: z.string().max(2000).optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateWorkoutBody
 * @description Inferred body type for the update-workout endpoint.
 */
export type UpdateWorkoutBody = z.infer<typeof UpdateWorkoutSchema>;

/**
 * @constant ListWorkoutsQuerySchema
 * @description Zod schema for the list-workouts query string (pagination plus an optional gym-location filter).
 */
export const ListWorkoutsQuerySchema = z.object({
    gymLocationId: z.uuid().optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().refine(value => PAGE_SIZES.includes(value), {
        message: `Page size must be one of ${PAGE_SIZES.join(', ')}`
    }).optional().default(DEFAULT_PAGE_SIZE)
});

/**
 * @interface ListWorkoutsRequest
 * @description Fastify request generic for listing workouts.
 *
 * @extends RequestGenericInterface
 */
export interface ListWorkoutsRequest extends RequestGenericInterface {
    Querystring: {
        gymLocationId?: string; /*!< Optional gym-location filter */
        page?: number; /*!< Optional 1-based page number */
        pageSize?: number; /*!< Optional page size (must be one of PAGE_SIZES) */
    };
}

/**
 * @interface CreateWorkoutRequest
 * @description Fastify request generic for creating a workout.
 *
 * @extends RequestGenericInterface
 */
export interface CreateWorkoutRequest extends RequestGenericInterface {
    Body: CreateWorkoutBody; /*!< Validated create-workout body */
}

/**
 * @interface UpdateWorkoutRequest
 * @description Fastify request generic for updating a workout.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateWorkoutRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Workout identifier */
    };
    Body: UpdateWorkoutBody; /*!< Validated update-workout body */
}

/**
 * @interface WorkoutParamsRequest
 * @description Fastify request generic for operations targeting a single workout by id.
 *
 * @extends RequestGenericInterface
 */
export interface WorkoutParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Workout identifier */
    };
}
