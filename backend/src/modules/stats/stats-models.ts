import type { RequestGenericInterface } from 'fastify';
import { z } from 'zod';

/**
 * @constant OverviewQuerySchema
 * @description Zod schema for the overview query string (optional date range).
 */
export const OverviewQuerySchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional()
});

/**
 * @constant VolumeQuerySchema
 * @description Zod schema for the volume-over-time query string (optional date range; period granularity defaults to week).
 */
export const VolumeQuerySchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    period: z.enum(['week', 'month']).optional().default('week')
});

/**
 * @constant MuscleDistributionQuerySchema
 * @description Zod schema for the muscle-distribution query string (optional date range).
 */
export const MuscleDistributionQuerySchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional()
});

/**
 * @constant CalendarQuerySchema
 * @description Zod schema for the calendar query string (optional date range).
 */
export const CalendarQuerySchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional()
});

/**
 * @interface OverviewRequest
 * @description Fastify request generic for the dashboard-overview endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface OverviewRequest extends RequestGenericInterface {
    Querystring: {
        from?: Date; /*!< Optional inclusive start of the range (coerced from ISO) */
        to?: Date; /*!< Optional upper-bound instant, applied as lte */
    };
}

/**
 * @interface VolumeRequest
 * @description Fastify request generic for the volume-over-time endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface VolumeRequest extends RequestGenericInterface {
    Querystring: {
        from?: Date; /*!< Optional inclusive start of the range (coerced from ISO) */
        to?: Date; /*!< Optional upper-bound instant, applied as lte */
        period?: 'week' | 'month'; /*!< Calendar granularity; defaults to 'week' */
    };
}

/**
 * @interface MuscleDistributionRequest
 * @description Fastify request generic for the muscle-distribution endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface MuscleDistributionRequest extends RequestGenericInterface {
    Querystring: {
        from?: Date; /*!< Optional inclusive start of the range (coerced from ISO) */
        to?: Date; /*!< Optional upper-bound instant, applied as lte */
    };
}

/**
 * @interface CalendarRequest
 * @description Fastify request generic for the calendar endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface CalendarRequest extends RequestGenericInterface {
    Querystring: {
        from?: Date; /*!< Optional inclusive start of the range (coerced from ISO) */
        to?: Date; /*!< Optional upper-bound instant, applied as lte */
    };
}
