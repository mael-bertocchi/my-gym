import type { FastifyInstance } from 'fastify';
import setsController from 'src/modules/sets/sets-controller';
import { CreateSetSchema, UpdateSetSchema } from 'src/modules/sets/sets-models';
import type { CreateSetRequest, SetParamsRequest, UpdateSetRequest } from 'src/modules/sets/sets-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function setsRoutes
 * @description Defines the routes for logging sets within a workout exercise.
 */
export default function (fastify: FastifyInstance): void {
    fastify.post<CreateSetRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: CreateSetSchema
        }
    }, setsController.createSet);

    fastify.patch<UpdateSetRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            body: UpdateSetSchema
        }
    }, setsController.updateSet);

    fastify.delete<SetParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, setsController.deleteSet);
}
