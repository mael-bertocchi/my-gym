import type { FastifyInstance } from 'fastify';
import statsController from 'src/modules/stats/stats-controller';
import type { VariantStatsRequest } from 'src/modules/stats/stats-models';
import { VariantStatsQuerySchema } from 'src/modules/stats/stats-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function statsRoutes
 * @description Defines the statistics routes.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<VariantStatsRequest>('/exercise-variants/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            querystring: VariantStatsQuerySchema
        }
    }, statsController.getVariantStats);
}
