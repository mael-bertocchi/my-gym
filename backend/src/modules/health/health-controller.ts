import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { GOOGLE_AI_BASE_URL } from 'src/plugins/google-ai';

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
        const res = await fetch(`${GOOGLE_AI_BASE_URL}/models/${request.server.variables.GOOGLE_AI_MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': request.server.variables.GOOGLE_AI_API_KEY
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: 'ping' }]
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
    checkGoogleAIHealth
};
