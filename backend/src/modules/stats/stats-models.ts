import type { RequestGenericInterface } from 'fastify';
import type { OverviewBucketUnit } from 'src/modules/stats/stats-overview';
import { z } from 'zod';

/**
 * @constant VariantStatsQuerySchema
 * @description Zod schema for the variant-stats query string (optional location + date-range filters; dates are coerced).
 */
export const VariantStatsQuerySchema = z.object({
    gymLocationId: z.uuid().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional()
});

/**
 * @interface VariantStatsRequest
 * @description Fastify request generic for the per-variant stats endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface VariantStatsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Exercise variant identifier */
    };
    Querystring: {
        gymLocationId?: string; /*!< Optional gym-location filter */
        from?: Date; /*!< Optional inclusive start of the date range (coerced from an ISO string) */
        to?: Date; /*!< Optional inclusive end of the date range (coerced from an ISO string) */
    };
}

/**
 * @constant OverviewQuerySchema
 * @description Zod schema for the overview query string (optional date range; bucket granularity defaults to week).
 */
export const OverviewQuerySchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    bucket: z.enum(['day', 'week', 'month']).optional().default('week')
});

/**
 * @interface OverviewRequest
 * @description Fastify request generic for the workout-overview endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface OverviewRequest extends RequestGenericInterface {
    Querystring: {
        from?: Date; /*!< Optional inclusive start of the range (coerced from ISO) */
        to?: Date; /*!< Optional inclusive end of the range (coerced from ISO) */
        bucket?: OverviewBucketUnit; /*!< Calendar granularity; defaults to 'week' */
    };
}
