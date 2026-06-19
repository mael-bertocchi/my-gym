import type { RequestGenericInterface } from 'fastify';
import { MuscleGroup } from 'prisma/generated/prisma/client';
import { z } from 'zod';

/**
 * @constant MuscleGroupSchema
 * @description Zod schema validating a value against the Prisma MuscleGroup enum.
 */
export const MuscleGroupSchema = z.enum(MuscleGroup);

/**
 * @constant CreateExerciseSchema
 * @description Zod schema for the create-exercise request body.
 */
export const CreateExerciseSchema = z.object({
    name: z.string().min(1).max(120),
    primaryMuscle: MuscleGroupSchema,
    secondaryMuscles: z.array(MuscleGroupSchema).optional().default([])
});

/**
 * @type CreateExerciseBody
 * @description Inferred body type for the create-exercise endpoint.
 */
export type CreateExerciseBody = z.infer<typeof CreateExerciseSchema>;

/**
 * @constant UpdateExerciseSchema
 * @description Zod schema for the update-exercise request body. Each field is optional, but at least one must be provided.
 */
export const UpdateExerciseSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    primaryMuscle: MuscleGroupSchema.optional(),
    secondaryMuscles: z.array(MuscleGroupSchema).optional(),
    isArchived: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateExerciseBody
 * @description Inferred body type for the update-exercise endpoint.
 */
export type UpdateExerciseBody = z.infer<typeof UpdateExerciseSchema>;

/**
 * @interface ListExercisesRequest
 * @description Fastify request generic for listing exercises with search + pagination.
 *
 * @extends RequestGenericInterface
 */
export interface ListExercisesRequest extends RequestGenericInterface {
    Querystring: {
        search?: string; /*!< Optional case-insensitive search across the exercise name */
        page?: number; /*!< Optional 1-based page number */
        pageSize?: number; /*!< Optional page size (must be one of PAGE_SIZES) */
    };
}

/**
 * @interface CreateExerciseRequest
 * @description Fastify request generic for creating an exercise.
 *
 * @extends RequestGenericInterface
 */
export interface CreateExerciseRequest extends RequestGenericInterface {
    Body: CreateExerciseBody; /*!< Validated create-exercise body */
}

/**
 * @interface UpdateExerciseRequest
 * @description Fastify request generic for updating an exercise.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateExerciseRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Exercise identifier */
    };
    Body: UpdateExerciseBody; /*!< Validated update-exercise body */
}

/**
 * @interface ExerciseParamsRequest
 * @description Fastify request generic for operations targeting a single exercise by id.
 *
 * @extends RequestGenericInterface
 */
export interface ExerciseParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Exercise identifier */
    };
}
