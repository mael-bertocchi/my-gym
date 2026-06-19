import type { FastifyInstance } from 'fastify';
import workoutsController from 'src/modules/workouts/workouts-controller';
import type { CreateWorkoutRequest, ListWorkoutsRequest, UpdateWorkoutRequest, WorkoutParamsRequest } from 'src/modules/workouts/workouts-models';
import { CreateWorkoutSchema, ListWorkoutsQuerySchema, UpdateWorkoutSchema } from 'src/modules/workouts/workouts-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function workoutsRoutes
 * @description Defines the routes for managing the user's workouts.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<ListWorkoutsRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListWorkoutsQuerySchema
        }
    }, workoutsController.listWorkouts);

    fastify.get<WorkoutParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, workoutsController.getWorkout);

    fastify.post<CreateWorkoutRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: CreateWorkoutSchema
        }
    }, workoutsController.createWorkout);

    fastify.patch<UpdateWorkoutRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            body: UpdateWorkoutSchema
        }
    }, workoutsController.updateWorkout);

    fastify.delete<WorkoutParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, workoutsController.deleteWorkout);
}
