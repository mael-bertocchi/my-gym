import type { FastifyInstance } from 'fastify';
import exercisesController from 'src/modules/exercises/exercises-controller';
import type { CreateExerciseRequest, ExerciseParamsRequest, ListExercisesRequest, UpdateExerciseRequest } from 'src/modules/exercises/exercises-models';
import { CreateExerciseSchema, UpdateExerciseSchema } from 'src/modules/exercises/exercises-models';
import { PaginationQuerySchema, UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function exercisesRoutes
 * @description Defines the routes for managing the user's exercises.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<ListExercisesRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: PaginationQuerySchema
        }
    }, exercisesController.listExercises);

    fastify.get<ExerciseParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, exercisesController.getExercise);

    fastify.post<CreateExerciseRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: CreateExerciseSchema
        }
    }, exercisesController.createExercise);

    fastify.patch<UpdateExerciseRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            body: UpdateExerciseSchema
        }
    }, exercisesController.updateExercise);

    fastify.delete<ExerciseParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, exercisesController.deleteExercise);
}
