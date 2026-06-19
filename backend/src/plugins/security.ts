import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import type { errorResponseBuilderContext } from '@fastify/rate-limit';
import fastifyRateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { StatusCodes } from 'http-status-codes';

/**
 * @function securityPlugin
 * @description Registers security-related plugins such as Helmet, CORS, and rate limiting
 */
export default fp(async function (fastify: FastifyInstance): Promise<void> {
    await fastify.register(fastifyHelmet);

    await fastify.register(fastifyCors, {
        origin: fastify.variables.CORS_ORIGINS.split(',').map((origin: string) => origin.trim()),
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    });

    await fastify.register(fastifyRateLimit, {
        timeWindow: '1 minute',
        max: 120,

        /**
         * @function errorResponseBuilder
         * @description Builds the response payload when the rate limit is exceeded
         */
        errorResponseBuilder: (request: FastifyRequest, context: errorResponseBuilderContext) => ({
            message: `Rate limit exceeded. Try again in ${context.after}`,
            statusCode: StatusCodes.TOO_MANY_REQUESTS
        })
    });
}, {
    name: 'security',
    dependencies: ['environment']
});
