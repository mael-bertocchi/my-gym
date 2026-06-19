import type { RequestGenericInterface } from 'fastify';
import { SetType } from 'prisma/generated/prisma/client';
import { z } from 'zod';

/**
 * @constant SetTypeSchema
 * @description Zod schema validating a value against the Prisma SetType enum.
 */
export const SetTypeSchema = z.enum(SetType);

/**
 * @constant CreateSetSchema
 * @description Zod schema for the create-set request body. setNumber defaults to next in the controller; setType/isCompleted fall back to the DB defaults.
 */
export const CreateSetSchema = z.object({
    workoutExerciseId: z.uuid(),
    setNumber: z.number().int().positive().optional(),
    setType: SetTypeSchema.optional(),
    weightKg: z.number().min(0).max(9999.99).optional(),
    reps: z.number().int().min(0).max(10000).optional(),
    rpe: z.number().min(0).max(10).optional(),
    restSeconds: z.number().int().min(0).optional(),
    durationSeconds: z.number().int().min(0).optional(),
    tempo: z.string().max(20).optional(),
    notes: z.string().max(2000).optional(),
    isCompleted: z.boolean().optional()
});

/**
 * @type CreateSetBody
 * @description Inferred body type for the create-set endpoint.
 */
export type CreateSetBody = z.infer<typeof CreateSetSchema>;

/**
 * @constant UpdateSetSchema
 * @description Zod schema for the update-set request body. Each field is optional, but at least one must be provided.
 */
export const UpdateSetSchema = z.object({
    setNumber: z.number().int().positive().optional(),
    setType: SetTypeSchema.optional(),
    weightKg: z.number().min(0).max(9999.99).nullable().optional(),
    reps: z.number().int().min(0).max(10000).optional(),
    rpe: z.number().min(0).max(10).optional(),
    restSeconds: z.number().int().min(0).optional(),
    durationSeconds: z.number().int().min(0).optional(),
    tempo: z.string().max(20).optional(),
    notes: z.string().max(2000).optional(),
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
 * @description Fastify request generic for creating a set.
 *
 * @extends RequestGenericInterface
 */
export interface CreateSetRequest extends RequestGenericInterface {
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
        id: string; /*!< Set identifier */
    };
    Body: UpdateSetBody; /*!< Validated update-set body */
}

/**
 * @interface SetParamsRequest
 * @description Fastify request generic for operations targeting a single set by id.
 *
 * @extends RequestGenericInterface
 */
export interface SetParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Set identifier */
    };
}
