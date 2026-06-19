import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from 'src/shared/pagination';
import { z } from 'zod';

/**
 * @constant UuidParamsSchema
 * @description Reusable schema for route params containing a single UUID.
 */
export const UuidParamsSchema = z.object({
    id: z.uuid()
});

/**
 * @constant PaginationQuerySchema
 * @description Reusable schema for pagination query parameters. Mirrors the shape consumed by parsePagination().
 */
export const PaginationQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().refine(value => PAGE_SIZES.includes(value), {
        message: `Page size must be one of ${PAGE_SIZES.join(', ')}`
    }).optional().default(DEFAULT_PAGE_SIZE),
    search: z.string().max(200).optional()
});
