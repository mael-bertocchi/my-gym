import type { FastifyInstance } from 'fastify';
import healthController from 'src/modules/health/health-controller';

/**
 * @function healthRoutes
 * @description Defines health check routes
 */
export default function (fastify: FastifyInstance): void {
    fastify.get('/', healthController.checkAppHealth);
    fastify.get('/google-ai', healthController.checkGoogleAIHealth);
}
