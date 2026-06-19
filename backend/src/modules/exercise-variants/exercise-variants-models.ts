import type { RequestGenericInterface } from 'fastify';
import { EquipmentType } from 'prisma/generated/prisma/client';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from 'src/shared/pagination';
import { z } from 'zod';

/**
 * @constant EquipmentTypeSchema
 * @description Zod schema validating a value against the Prisma EquipmentType enum.
 */
export const EquipmentTypeSchema = z.enum(EquipmentType);

/**
 * @constant CreateExerciseVariantSchema
 * @description Zod schema for the create-variant request body. machineBrandId is required when equipmentType is MACHINE (enforced in the controller).
 */
export const CreateExerciseVariantSchema = z.object({
    exerciseId: z.uuid(),
    equipmentType: EquipmentTypeSchema,
    machineBrandId: z.uuid().optional()
});

/**
 * @type CreateExerciseVariantBody
 * @description Inferred body type for the create-variant endpoint.
 */
export type CreateExerciseVariantBody = z.infer<typeof CreateExerciseVariantSchema>;

/**
 * @constant ListExerciseVariantsQuerySchema
 * @description Zod schema for the list-variants query string (pagination plus an optional exercise filter).
 */
export const ListExerciseVariantsQuerySchema = z.object({
    exerciseId: z.uuid().optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().refine(value => PAGE_SIZES.includes(value), {
        message: `Page size must be one of ${PAGE_SIZES.join(', ')}`
    }).optional().default(DEFAULT_PAGE_SIZE)
});

/**
 * @interface ListExerciseVariantsRequest
 * @description Fastify request generic for listing variants, optionally filtered by exercise.
 *
 * @extends RequestGenericInterface
 */
export interface ListExerciseVariantsRequest extends RequestGenericInterface {
    Querystring: {
        exerciseId?: string; /*!< Optional exercise filter */
        page?: number; /*!< Optional 1-based page number */
        pageSize?: number; /*!< Optional page size (must be one of PAGE_SIZES) */
    };
}

/**
 * @interface CreateExerciseVariantRequest
 * @description Fastify request generic for creating a variant.
 *
 * @extends RequestGenericInterface
 */
export interface CreateExerciseVariantRequest extends RequestGenericInterface {
    Body: CreateExerciseVariantBody; /*!< Validated create-variant body */
}

/**
 * @interface ExerciseVariantParamsRequest
 * @description Fastify request generic for operations targeting a single variant by id.
 *
 * @extends RequestGenericInterface
 */
export interface ExerciseVariantParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Variant identifier */
    };
}
