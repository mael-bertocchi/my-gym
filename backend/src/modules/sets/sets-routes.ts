import type { FastifyInstance } from 'fastify';
import setsController from 'src/modules/sets/sets-controller';
import type { CreateSetRequest, SetParamsRequest, UpdateSetRequest } from 'src/modules/sets/sets-models';
import { CreateSetSchema, SetCreateParamsSchema, SetParamsSchema, UpdateSetSchema } from 'src/modules/sets/sets-models';

/**
 * @function setsRoutes
 * @description Defines the routes for logging sets nested within a workout exercise.
 */
export default function (fastify: FastifyInstance): void {
    fastify.post<CreateSetRequest>('/:workoutId/exercises/:workoutExerciseId/sets', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: SetCreateParamsSchema,
            body: CreateSetSchema
        }
    }, setsController.createSet);

    fastify.patch<UpdateSetRequest>('/:workoutId/exercises/:workoutExerciseId/sets/:setId', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: SetParamsSchema,
            body: UpdateSetSchema
        }
    }, setsController.updateSet);

    fastify.delete<SetParamsRequest>('/:workoutId/exercises/:workoutExerciseId/sets/:setId', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: SetParamsSchema
        }
    }, setsController.deleteSet);
}
