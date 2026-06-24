import type { RequestGenericInterface } from 'fastify';
import { CursorQuerySchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant ListExerciseGroupsQuerySchema
 * @description Zod schema for the list-groups query string (cursor pagination plus an optional name search).
 */
export const ListExerciseGroupsQuerySchema = CursorQuerySchema.extend({
    search: z.string().max(200).optional()
});

/**
 * @constant CreateExerciseGroupSchema
 * @description Zod schema for the create-group request body.
 */
export const CreateExerciseGroupSchema = z.object({
    name: z.string().min(1).max(120)
});

/**
 * @type CreateExerciseGroupBody
 * @description Inferred body type for the create-group endpoint.
 */
export type CreateExerciseGroupBody = z.infer<typeof CreateExerciseGroupSchema>;

/**
 * @constant UpdateExerciseGroupSchema
 * @description Zod schema for the update-group request body.
 */
export const UpdateExerciseGroupSchema = z.object({
    name: z.string().min(1).max(120)
});

/**
 * @type UpdateExerciseGroupBody
 * @description Inferred body type for the update-group endpoint.
 */
export type UpdateExerciseGroupBody = z.infer<typeof UpdateExerciseGroupSchema>;

/**
 * @interface ListExerciseGroupsRequest
 * @description Fastify request generic for listing exercise groups with search + cursor pagination.
 *
 * @extends RequestGenericInterface
 */
export interface ListExerciseGroupsRequest extends RequestGenericInterface {
    Querystring: {
        search?: string; /*!< Optional case-insensitive search across the group name */
        limit?: number; /*!< Optional page size (1..MAX_LIMIT) */
        cursor?: string; /*!< Optional id of the previous page's last item */
    };
}

/**
 * @interface CreateExerciseGroupRequest
 * @description Fastify request generic for creating an exercise group.
 *
 * @extends RequestGenericInterface
 */
export interface CreateExerciseGroupRequest extends RequestGenericInterface {
    Body: CreateExerciseGroupBody; /*!< Validated create-group body */
}

/**
 * @interface UpdateExerciseGroupRequest
 * @description Fastify request generic for updating an exercise group.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateExerciseGroupRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Exercise group identifier */
    };
    Body: UpdateExerciseGroupBody; /*!< Validated update-group body */
}

/**
 * @interface ExerciseGroupParamsRequest
 * @description Fastify request generic for operations targeting a single exercise group by id.
 *
 * @extends RequestGenericInterface
 */
export interface ExerciseGroupParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Exercise group identifier */
    };
}
