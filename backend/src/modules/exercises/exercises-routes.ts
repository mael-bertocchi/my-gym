import type { FastifyInstance } from 'fastify';
import exercisesController from 'src/modules/exercises/exercises-controller';
import type { CreateExerciseRequest, ExerciseLastRequest, ExerciseParamsRequest, ExerciseRangeRequest, ListExercisesRequest, UpdateExerciseRequest } from 'src/modules/exercises/exercises-models';
import { CreateExerciseSchema, ExerciseLastQuerySchema, ExerciseRangeQuerySchema, ListExercisesQuerySchema, UpdateExerciseSchema } from 'src/modules/exercises/exercises-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function exercisesRoutes
 * @description Defines the caller's personal exercise catalog routes and per-exercise history/stats/pre-fill.
 */
export default function (fastify: FastifyInstance): void {
    const authenticated = [fastify.authentication.authenticate];

    fastify.get<ListExercisesRequest>('/', {
        preHandler: authenticated,
        schema: {
            querystring: ListExercisesQuerySchema
        }
    }, exercisesController.listExercises);

    fastify.get<ExerciseParamsRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema
        }
    }, exercisesController.getExercise);

    fastify.post<CreateExerciseRequest>('/', {
        preHandler: authenticated,
        schema: {
            body: CreateExerciseSchema
        }
    }, exercisesController.createExercise);

    fastify.patch<UpdateExerciseRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema,
            body: UpdateExerciseSchema
        }
    }, exercisesController.updateExercise);

    fastify.delete<ExerciseParamsRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema
        }
    }, exercisesController.deleteExercise);

    fastify.get<ExerciseRangeRequest>('/:id/history', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema,
            querystring: ExerciseRangeQuerySchema
        }
    }, exercisesController.getExerciseHistory);

    fastify.get<ExerciseRangeRequest>('/:id/stats', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema,
            querystring: ExerciseRangeQuerySchema
        }
    }, exercisesController.getExerciseStats);

    fastify.get<ExerciseLastRequest>('/:id/last', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema,
            querystring: ExerciseLastQuerySchema
        }
    }, exercisesController.getExerciseLast);
}
