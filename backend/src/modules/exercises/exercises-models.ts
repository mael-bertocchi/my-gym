import type { RequestGenericInterface } from 'fastify';
import { MuscleGroup } from 'prisma/generated/prisma/client';
import { CursorQuerySchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant MuscleGroupSchema
 * @description Zod schema validating a value against the Prisma MuscleGroup enum.
 */
export const MuscleGroupSchema = z.enum(MuscleGroup);

/**
 * @constant ListExercisesQuerySchema
 * @description Zod schema for the list-exercises query string (cursor pagination plus group/equipment/brand/muscle/name filters).
 */
export const ListExercisesQuerySchema = CursorQuerySchema.extend({
    groupId: z.uuid().optional(),
    equipmentId: z.uuid().optional(),
    brandId: z.uuid().optional(),
    muscle: MuscleGroupSchema.optional(),
    q: z.string().max(200).optional()
});

/**
 * @constant CreateExerciseSchema
 * @description Zod schema for the create-exercise request body.
 */
export const CreateExerciseSchema = z.object({
    name: z.string().min(1).max(120),
    primaryMuscle: MuscleGroupSchema,
    secondaryMuscles: z.array(MuscleGroupSchema).optional().default([]),
    equipmentId: z.uuid().optional(),
    groupId: z.uuid().optional()
});

/**
 * @type CreateExerciseBody
 * @description Inferred body type for the create-exercise endpoint.
 */
export type CreateExerciseBody = z.infer<typeof CreateExerciseSchema>;

/**
 * @constant UpdateExerciseSchema
 * @description Zod schema for the update-exercise request body. Each field is optional, but at least one must be provided. A null equipmentId/groupId detaches that link.
 */
export const UpdateExerciseSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    primaryMuscle: MuscleGroupSchema.optional(),
    secondaryMuscles: z.array(MuscleGroupSchema).optional(),
    equipmentId: z.uuid().nullable().optional(),
    groupId: z.uuid().nullable().optional(),
    isFavorite: z.boolean().optional(),
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
 * @constant ExerciseRangeQuerySchema
 * @description Zod schema for the per-exercise history/stats query string (optional gym + date-range filters; dates are coerced).
 */
export const ExerciseRangeQuerySchema = z.object({
    gymId: z.uuid().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional()
});

/**
 * @constant ExerciseLastQuerySchema
 * @description Zod schema for the per-exercise pre-fill query string (optional gym filter).
 */
export const ExerciseLastQuerySchema = z.object({
    gymId: z.uuid().optional()
});

/**
 * @interface ListExercisesRequest
 * @description Fastify request generic for listing exercises with filters + cursor pagination.
 *
 * @extends RequestGenericInterface
 */
export interface ListExercisesRequest extends RequestGenericInterface {
    Querystring: {
        groupId?: string; /*!< Optional movement-group filter */
        equipmentId?: string; /*!< Optional equipment filter */
        brandId?: string; /*!< Optional brand filter (via the linked equipment) */
        muscle?: MuscleGroup; /*!< Optional muscle filter (matches primary or secondary) */
        q?: string; /*!< Optional case-insensitive search across the exercise name */
        limit?: number; /*!< Optional page size (1..MAX_LIMIT) */
        cursor?: string; /*!< Optional id of the previous page's last item */
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

/**
 * @interface ExerciseRangeRequest
 * @description Fastify request generic for the per-exercise history and stats endpoints.
 *
 * @extends RequestGenericInterface
 */
export interface ExerciseRangeRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Exercise identifier */
    };
    Querystring: {
        gymId?: string; /*!< Optional gym filter */
        from?: Date; /*!< Optional inclusive start of the range (coerced from ISO) */
        to?: Date; /*!< Optional upper-bound instant, applied as lte */
    };
}

/**
 * @interface ExerciseLastRequest
 * @description Fastify request generic for the per-exercise pre-fill endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface ExerciseLastRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Exercise identifier */
    };
    Querystring: {
        gymId?: string; /*!< Optional gym filter */
    };
}
