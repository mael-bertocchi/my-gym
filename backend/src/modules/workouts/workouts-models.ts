import type { RequestGenericInterface } from 'fastify';
import { CursorQuerySchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant WorkoutParamsSchema
 * @description Zod schema for route params identifying a single workout.
 */
export const WorkoutParamsSchema = z.object({
    workoutId: z.uuid()
});

/**
 * @constant ListWorkoutsQuerySchema
 * @description Zod schema for the list-workouts query string (cursor pagination plus date-range and gym filters).
 */
export const ListWorkoutsQuerySchema = CursorQuerySchema.extend({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    gymId: z.uuid().optional()
});

/**
 * @constant CreateWorkoutSchema
 * @description Zod schema for the create-workout request body. All fields are optional; startedAt defaults to now in the controller.
 */
export const CreateWorkoutSchema = z.object({
    gymId: z.uuid().optional(),
    name: z.string().min(1).max(120).optional(),
    startedAt: z.coerce.date().optional(),
    notes: z.string().max(2000).optional(),
    difficultyRating: z.number().int().min(1).max(10).nullable().optional(),
    enjoymentRating: z.number().int().min(1).max(5).nullable().optional()
});

/**
 * @type CreateWorkoutBody
 * @description Inferred body type for the create-workout endpoint.
 */
export type CreateWorkoutBody = z.infer<typeof CreateWorkoutSchema>;

/**
 * @constant UpdateWorkoutSchema
 * @description Zod schema for the update-workout request body. Each field is optional, but at least one must be provided. A null gymId/endedAt/averageHeartRate/difficultyRating/enjoymentRating clears that field.
 */
export const UpdateWorkoutSchema = z.object({
    gymId: z.uuid().nullable().optional(),
    name: z.string().min(1).max(120).optional(),
    startedAt: z.coerce.date().optional(),
    endedAt: z.coerce.date().nullable().optional(),
    notes: z.string().max(2000).optional(),
    averageHeartRate: z.number().int().min(1).max(300).nullable().optional(),
    caloriesBurned: z.number().int().min(1).max(30000).nullable().optional(),
    difficultyRating: z.number().int().min(1).max(10).nullable().optional(),
    enjoymentRating: z.number().int().min(1).max(5).nullable().optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateWorkoutBody
 * @description Inferred body type for the update-workout endpoint.
 */
export type UpdateWorkoutBody = z.infer<typeof UpdateWorkoutSchema>;

/**
 * @interface ListWorkoutsRequest
 * @description Fastify request generic for listing the caller's workouts.
 *
 * @extends RequestGenericInterface
 */
export interface ListWorkoutsRequest extends RequestGenericInterface {
    Querystring: {
        from?: Date; /*!< Optional inclusive start of the range (coerced from ISO) */
        to?: Date; /*!< Optional upper-bound instant, applied as lte */
        gymId?: string; /*!< Optional gym filter */
        limit?: number; /*!< Optional page size (1..MAX_LIMIT) */
        cursor?: string; /*!< Optional id of the previous page's last item */
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
        workoutId: string; /*!< Workout identifier */
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
        workoutId: string; /*!< Workout identifier */
    };
}
