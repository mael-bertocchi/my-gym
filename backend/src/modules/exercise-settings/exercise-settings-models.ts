import type { RequestGenericInterface } from 'fastify';
import { CursorQuerySchema, SettingsSchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant ListExerciseSettingsQuerySchema
 * @description Zod schema for the list-settings query string (cursor pagination plus an exercise filter).
 */
export const ListExerciseSettingsQuerySchema = CursorQuerySchema.extend({
    exerciseId: z.uuid().optional()
});

/**
 * @constant UpsertExerciseSettingSchema
 * @description Zod schema for the upsert-settings request body (keyed by exercise for the caller).
 */
export const UpsertExerciseSettingSchema = z.object({
    exerciseId: z.uuid(),
    settings: SettingsSchema
});

/**
 * @type UpsertExerciseSettingBody
 * @description Inferred body type for the upsert-settings endpoint.
 */
export type UpsertExerciseSettingBody = z.infer<typeof UpsertExerciseSettingSchema>;

/**
 * @interface ListExerciseSettingsRequest
 * @description Fastify request generic for listing the caller's remembered settings.
 *
 * @extends RequestGenericInterface
 */
export interface ListExerciseSettingsRequest extends RequestGenericInterface {
    Querystring: {
        exerciseId?: string; /*!< Optional exercise filter */
        limit?: number; /*!< Optional page size (1..MAX_LIMIT) */
        cursor?: string; /*!< Optional id of the previous page's last item */
    };
}

/**
 * @interface UpsertExerciseSettingRequest
 * @description Fastify request generic for upserting a remembered setting.
 *
 * @extends RequestGenericInterface
 */
export interface UpsertExerciseSettingRequest extends RequestGenericInterface {
    Body: UpsertExerciseSettingBody; /*!< Validated upsert-settings body */
}

/**
 * @interface ExerciseSettingParamsRequest
 * @description Fastify request generic for operations targeting a single remembered setting by id.
 *
 * @extends RequestGenericInterface
 */
export interface ExerciseSettingParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Exercise setting identifier */
    };
}
