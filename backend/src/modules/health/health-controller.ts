import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';

/**
 * @function checkAppHealth
 * @description Returns service health metadata
 */
function checkAppHealth(request: FastifyRequest, reply: FastifyReply): void {
    reply.status(StatusCodes.OK).send({
        data: {
            uptime: process.uptime()
        }
    });
}

/**
 * @function checkGoogleAIHealth
 * @description Verifies Google AI Studio (Gemini) connection and availability
 */
async function checkGoogleAIHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
        await request.server.ai.ping();

        return await reply.status(StatusCodes.NO_CONTENT).send();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        return await reply.status(StatusCodes.SERVICE_UNAVAILABLE).send({
            data: {
                status: 'unhealthy',
                reason: message
            }
        });
    }
}

export default {
    checkAppHealth,
    checkGoogleAIHealth
};
