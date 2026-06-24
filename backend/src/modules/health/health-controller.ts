import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';

/**
 * @function checkAppHealth
 * @description Returns service health metadata (liveness/readiness).
 */
function checkAppHealth(request: FastifyRequest, reply: FastifyReply): void {
    reply.status(StatusCodes.OK).send({
        data: {
            uptime: process.uptime()
        }
    });
}

export default {
    checkAppHealth
};
