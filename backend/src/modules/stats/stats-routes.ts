import type { FastifyInstance } from 'fastify';
import statsController from 'src/modules/stats/stats-controller';
import type { CalendarRequest, MuscleDistributionRequest, OverviewRequest, VolumeRequest } from 'src/modules/stats/stats-models';
import { CalendarQuerySchema, MuscleDistributionQuerySchema, OverviewQuerySchema, VolumeQuerySchema } from 'src/modules/stats/stats-models';

/**
 * @function statsRoutes
 * @description Defines the caller's statistics routes.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<OverviewRequest>('/overview', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: OverviewQuerySchema
        }
    }, statsController.getOverview);

    fastify.get<VolumeRequest>('/volume', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: VolumeQuerySchema
        }
    }, statsController.getVolume);

    fastify.get<MuscleDistributionRequest>('/muscle-distribution', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: MuscleDistributionQuerySchema
        }
    }, statsController.getMuscleDistribution);

    fastify.get('/personal-records', {
        preHandler: [fastify.authentication.authenticate]
    }, statsController.getPersonalRecords);

    fastify.get<CalendarRequest>('/calendar', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: CalendarQuerySchema
        }
    }, statsController.getCalendar);
}
