import type { FastifyInstance } from 'fastify';
import healthController from 'src/modules/health/health-controller';

/**
 * @function healthRoutes
 * @description Defines the health check route.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get('/', healthController.checkAppHealth);
}
