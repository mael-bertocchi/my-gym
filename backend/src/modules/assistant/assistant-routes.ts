import type { FastifyInstance } from 'fastify';
import assistantController from 'src/modules/assistant/assistant-controller';
import type { AdviceParamsRequest } from 'src/modules/assistant/assistant-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function assistantRoutes
 * @description Defines the AI assistant routes.
 */
export default function (fastify: FastifyInstance): void {
    fastify.post<AdviceParamsRequest>('/exercise-variants/:id/advice', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, assistantController.getVariantAdvice);
}
