import type { RequestGenericInterface } from 'fastify';
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
