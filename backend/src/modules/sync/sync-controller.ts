import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { SyncPullRequest, SyncPushRequest } from 'src/modules/sync/sync-models';
import { pullChanges, pushChanges } from 'src/modules/sync/sync-service';

/**
 * @function getSync
 * @description Returns the catalog and the caller's logs/settings changed since `since`, plus deletion tombstones, for an offline client to apply.
 *
 * @returns {Promise<void>} Resolves when the changes are sent.
 */
async function getSync(request: FastifyRequest<SyncPullRequest>, reply: FastifyReply): Promise<void> {
    const serverTime = new Date();

    const changes = await pullChanges(request.server.prisma, request.user.id, request.query.since);

    reply.status(StatusCodes.OK).send({ data: { serverTime: serverTime.toISOString(), ...changes } });
}

/**
 * @function postSync
 * @description Applies a batch of queued offline changes and returns the per-item results.
 *
 * @returns {Promise<void>} Resolves when the results are sent.
 */
async function postSync(request: FastifyRequest<SyncPushRequest>, reply: FastifyReply): Promise<void> {
    const serverTime = new Date();

    const results = await pushChanges(request.server.prisma, request.user.id, request.body);

    reply.status(StatusCodes.OK).send({ data: { serverTime: serverTime.toISOString(), results } });
}

export default {
    getSync,
    postSync
};
