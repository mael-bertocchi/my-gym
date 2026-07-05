import type { RequestGenericInterface } from 'fastify';
import { SetSide, SetType } from 'prisma/generated/prisma/client';
import { z } from 'zod';

/**
 * @constant SetTypeSchema
 * @description Zod schema validating a value against the Prisma SetType enum.
 */
export const SetTypeSchema = z.enum(SetType);

/**
 * @constant SetSideSchema
 * @description Zod schema validating a value against the Prisma SetSide enum (which arm of a single-arm set). Null/absent means a normal two-sided set.
 */
export const SetSideSchema = z.enum(SetSide);

/**
 * @constant SetCreateParamsSchema
 * @description Zod schema for route params when adding a set to a workout exercise.
 */
export const SetCreateParamsSchema = z.object({
    workoutId: z.uuid(),
    workoutExerciseId: z.uuid()
});

/**
 * @constant SetParamsSchema
 * @description Zod schema for route params identifying a single set.
 */
export const SetParamsSchema = z.object({
    workoutId: z.uuid(),
    workoutExerciseId: z.uuid(),
    setId: z.uuid()
});

/**
 * @constant CreateSetSchema
 * @description Zod schema for the create-set request body. setNumber defaults to next in the controller; setType/isCompleted fall back to the DB defaults.
 */
export const CreateSetSchema = z.object({
    setNumber: z.number().int().positive().optional(),
    setType: SetTypeSchema.optional(),
    side: SetSideSchema.nullable().optional(),
    weightKg: z.number().min(0).max(9999.99).optional(),
    reps: z.number().int().min(0).max(10000).optional(),
    distanceM: z.number().min(0).max(99999999.99).optional(),
    durationSeconds: z.number().int().min(0).optional(),
    isCompleted: z.boolean().optional()
});

/**
 * @type CreateSetBody
 * @description Inferred body type for the create-set endpoint.
 */
export type CreateSetBody = z.infer<typeof CreateSetSchema>;

/**
 * @constant UpdateSetSchema
 * @description Zod schema for the update-set request body. Each field is optional, but at least one must be provided. A null weight/distance clears it.
 */
export const UpdateSetSchema = z.object({
    setNumber: z.number().int().positive().optional(),
    setType: SetTypeSchema.optional(),
    side: SetSideSchema.nullable().optional(),
    weightKg: z.number().min(0).max(9999.99).nullable().optional(),
    reps: z.number().int().min(0).max(10000).nullable().optional(),
    distanceM: z.number().min(0).max(99999999.99).nullable().optional(),
    durationSeconds: z.number().int().min(0).nullable().optional(),
    isCompleted: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateSetBody
 * @description Inferred body type for the update-set endpoint.
 */
export type UpdateSetBody = z.infer<typeof UpdateSetSchema>;

/**
 * @interface CreateSetRequest
 * @description Fastify request generic for adding a set to a workout exercise.
 *
 * @extends RequestGenericInterface
 */
export interface CreateSetRequest extends RequestGenericInterface {
    Params: {
        workoutId: string; /*!< Workout identifier */
        workoutExerciseId: string; /*!< Workout exercise identifier */
    };
    Body: CreateSetBody; /*!< Validated create-set body */
}

/**
 * @interface UpdateSetRequest
 * @description Fastify request generic for updating a set.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateSetRequest extends RequestGenericInterface {
    Params: {
        workoutId: string; /*!< Workout identifier */
        workoutExerciseId: string; /*!< Workout exercise identifier */
        setId: string; /*!< Set identifier */
    };
    Body: UpdateSetBody; /*!< Validated update-set body */
}

/**
 * @interface SetParamsRequest
 * @description Fastify request generic for operations targeting a single set.
 *
 * @extends RequestGenericInterface
 */
export interface SetParamsRequest extends RequestGenericInterface {
    Params: {
        workoutId: string; /*!< Workout identifier */
        workoutExerciseId: string; /*!< Workout exercise identifier */
        setId: string; /*!< Set identifier */
    };
}
