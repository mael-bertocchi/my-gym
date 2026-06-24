import { MAX_LIMIT } from 'src/shared/pagination';
import { z } from 'zod';

/**
 * @constant UuidParamsSchema
 * @description Reusable schema for route params containing a single UUID.
 */
export const UuidParamsSchema = z.object({
    id: z.uuid()
});

/**
 * @constant CursorQuerySchema
 * @description Reusable schema for cursor-pagination query parameters. Mirrors the shape consumed by parseCursor(). Endpoints with additional filters extend this schema.
 */
export const CursorQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
    cursor: z.uuid().optional()
});

/**
 * @constant SettingsSchema
 * @description Reusable schema for free-form, structured key/value settings (e.g. seat height, pad position) stored as JSON.
 */
export const SettingsSchema = z.record(z.string(), z.unknown());
