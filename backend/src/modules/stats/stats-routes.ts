import type { FastifyInstance } from 'fastify';
import statsController from 'src/modules/stats/stats-controller';
import type { MusclesRequest, OverviewRequest, VariantStatsRequest } from 'src/modules/stats/stats-models';
import { MusclesQuerySchema, OverviewQuerySchema, VariantStatsQuerySchema } from 'src/modules/stats/stats-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function statsRoutes
 * @description Defines the statistics routes.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<MusclesRequest>('/muscles', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: MusclesQuerySchema
        }
    }, statsController.getMuscles);

    fastify.get<OverviewRequest>('/overview', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: OverviewQuerySchema
        }
    }, statsController.getOverview);

    fastify.get<VariantStatsRequest>('/exercise-variants/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            querystring: VariantStatsQuerySchema
        }
    }, statsController.getVariantStats);
}
