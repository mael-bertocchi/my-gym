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
 * @function checkAzureAIHealth
 * @description Verifies Azure AI Foundry connection and availability
 */
async function checkAzureAIHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
        const res = await fetch(`${request.server.variables.AZURE_AI_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': request.server.variables.AZURE_AI_API_KEY
            },
            body: JSON.stringify({
                temperature: 0.5,
                messages: [
                    {
                        role: 'user',
                        content: 'ping'
                    }
                ]
            })
        });

        if (res.ok) {
            return await reply.status(StatusCodes.NO_CONTENT).send();
        } else {
            const errorBody = await res.text();
            return await reply.status(StatusCodes.SERVICE_UNAVAILABLE).send({
                data: {
                    status: res.status,
                    reason: res.statusText,
                    details: errorBody
                }
            });
        }
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
    checkAzureAIHealth
};
