import type { FastifyInstance } from 'fastify';
import exercisesController from 'src/modules/exercises/exercises-controller';
import type { CreateExerciseRequest, ExerciseLastRequest, ExerciseParamsRequest, ExerciseRangeRequest, ListExercisesRequest, UpdateExerciseRequest } from 'src/modules/exercises/exercises-models';
import { CreateExerciseSchema, ExerciseLastQuerySchema, ExerciseRangeQuerySchema, ListExercisesQuerySchema, UpdateExerciseSchema } from 'src/modules/exercises/exercises-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function exercisesRoutes
 * @description Defines the exercise catalog routes (authenticated reads, administrator writes) and the caller's per-exercise history/stats/pre-fill.
 */
export default function (fastify: FastifyInstance): void {
    const administrator = [fastify.authentication.authenticate, fastify.authentication.authorizeAdministrator];

    fastify.get<ListExercisesRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListExercisesQuerySchema
        }
    }, exercisesController.listExercises);

    fastify.get<ExerciseParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, exercisesController.getExercise);

    fastify.post<CreateExerciseRequest>('/', {
        preHandler: administrator,
        schema: {
            body: CreateExerciseSchema
        }
    }, exercisesController.createExercise);

    fastify.patch<UpdateExerciseRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema,
            body: UpdateExerciseSchema
        }
    }, exercisesController.updateExercise);

    fastify.delete<ExerciseParamsRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema
        }
    }, exercisesController.deleteExercise);

    fastify.get<ExerciseRangeRequest>('/:id/history', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            querystring: ExerciseRangeQuerySchema
        }
    }, exercisesController.getExerciseHistory);

    fastify.get<ExerciseRangeRequest>('/:id/stats', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            querystring: ExerciseRangeQuerySchema
        }
    }, exercisesController.getExerciseStats);

    fastify.get<ExerciseLastRequest>('/:id/last', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            querystring: ExerciseLastQuerySchema
        }
    }, exercisesController.getExerciseLast);
}
