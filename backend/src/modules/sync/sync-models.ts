import type { RequestGenericInterface } from 'fastify';
import { SyncEntityType } from 'prisma/generated/prisma/client';
import { SetTypeSchema } from 'src/modules/sets/sets-models';
import { SettingsSchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant MAX_BATCH
 * @description Upper bound on the number of items of each kind accepted in a single push.
 */
const MAX_BATCH = 500;

/**
 * @constant SyncSetSchema
 * @description Zod schema for one set within a pushed workout aggregate (client-generated id).
 */
export const SyncSetSchema = z.object({
    id: z.uuid(),
    setNumber: z.number().int().positive(),
    setType: SetTypeSchema.optional(),
    weightKg: z.number().min(0).max(9999.99).nullable().optional(),
    reps: z.number().int().min(0).max(10000).nullable().optional(),
    distanceM: z.number().min(0).max(99999999.99).nullable().optional(),
    durationSeconds: z.number().int().min(0).nullable().optional(),
    isCompleted: z.boolean().optional()
});

/**
 * @constant SyncWorkoutExerciseSchema
 * @description Zod schema for one exercise within a pushed workout aggregate.
 */
export const SyncWorkoutExerciseSchema = z.object({
    id: z.uuid(),
    exerciseId: z.uuid(),
    position: z.number().int().positive(),
    notes: z.string().max(2000).nullable().optional(),
    settings: SettingsSchema.nullable().optional(),
    supersetId: z.uuid().nullable().optional(),
    sets: z.array(SyncSetSchema).max(MAX_BATCH)
});

/**
 * @constant SyncWorkoutSchema
 * @description Zod schema for a pushed workout aggregate (workout plus its exercises and sets) with the client's local last-modified time.
 */
export const SyncWorkoutSchema = z.object({
    id: z.uuid(),
    gymId: z.uuid().nullable().optional(),
    name: z.string().min(1).max(120).nullable().optional(),
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    updatedAt: z.coerce.date(),
    exercises: z.array(SyncWorkoutExerciseSchema).max(MAX_BATCH)
});

/**
 * @constant SyncSettingSchema
 * @description Zod schema for a pushed remembered setting with the client's local last-modified time.
 */
export const SyncSettingSchema = z.object({
    id: z.uuid(),
    exerciseId: z.uuid(),
    settings: SettingsSchema,
    updatedAt: z.coerce.date()
});

/**
 * @constant SyncDeletionSchema
 * @description Zod schema for a pushed deletion of a caller-owned entity.
 */
export const SyncDeletionSchema = z.object({
    entityType: z.enum(SyncEntityType),
    entityId: z.uuid()
});

/**
 * @constant PushBodySchema
 * @description Zod schema for the sync-push request body. Every collection is optional and defaults to empty.
 */
export const PushBodySchema = z.object({
    workouts: z.array(SyncWorkoutSchema).max(MAX_BATCH).optional().default([]),
    exerciseSettings: z.array(SyncSettingSchema).max(MAX_BATCH).optional().default([]),
    deletions: z.array(SyncDeletionSchema).max(MAX_BATCH).optional().default([])
});

/**
 * @type PushBody
 * @description Inferred body type for the sync-push endpoint.
 */
export type PushBody = z.infer<typeof PushBodySchema>;

/**
 * @type SyncWorkoutInput
 * @description Inferred type for one pushed workout aggregate.
 */
export type SyncWorkoutInput = z.infer<typeof SyncWorkoutSchema>;

/**
 * @type SyncSettingInput
 * @description Inferred type for one pushed remembered setting.
 */
export type SyncSettingInput = z.infer<typeof SyncSettingSchema>;

/**
 * @type SyncDeletionInput
 * @description Inferred type for one pushed deletion.
 */
export type SyncDeletionInput = z.infer<typeof SyncDeletionSchema>;

/**
 * @constant PullQuerySchema
 * @description Zod schema for the sync-pull query string. Omitting `since` requests a full snapshot.
 */
export const PullQuerySchema = z.object({
    since: z.coerce.date().optional()
});

/**
 * @interface SyncPullRequest
 * @description Fastify request generic for the pull endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface SyncPullRequest extends RequestGenericInterface {
    Querystring: {
        since?: Date; /*!< Optional lower bound; only records changed after it are returned */
    };
}

/**
 * @interface SyncPushRequest
 * @description Fastify request generic for the push endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface SyncPushRequest extends RequestGenericInterface {
    Body: PushBody; /*!< Validated batch of queued offline changes */
}
