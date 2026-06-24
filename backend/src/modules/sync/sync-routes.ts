import type { FastifyInstance } from 'fastify';
import syncController from 'src/modules/sync/sync-controller';
import type { SyncPullRequest, SyncPushRequest } from 'src/modules/sync/sync-models';
import { PullQuerySchema, PushBodySchema } from 'src/modules/sync/sync-models';

/**
 * @function syncRoutes
 * @description Defines the offline-sync routes (pull changes since a timestamp, push a queued batch).
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<SyncPullRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: PullQuerySchema
        }
    }, syncController.getSync);

    fastify.post<SyncPushRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: PushBodySchema
        }
    }, syncController.postSync);
}
