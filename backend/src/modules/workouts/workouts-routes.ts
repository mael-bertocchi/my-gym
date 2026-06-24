import type { FastifyInstance } from 'fastify';
import workoutsController from 'src/modules/workouts/workouts-controller';
import type { CreateWorkoutRequest, ListWorkoutsRequest, UpdateWorkoutRequest, WorkoutParamsRequest } from 'src/modules/workouts/workouts-models';
import { CreateWorkoutSchema, ListWorkoutsQuerySchema, UpdateWorkoutSchema, WorkoutParamsSchema } from 'src/modules/workouts/workouts-models';

/**
 * @function workoutsRoutes
 * @description Defines the caller's workout routes.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<ListWorkoutsRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListWorkoutsQuerySchema
        }
    }, workoutsController.listWorkouts);

    fastify.post<CreateWorkoutRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: CreateWorkoutSchema
        }
    }, workoutsController.createWorkout);

    fastify.get<WorkoutParamsRequest>('/:workoutId', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: WorkoutParamsSchema
        }
    }, workoutsController.getWorkout);

    fastify.patch<UpdateWorkoutRequest>('/:workoutId', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: WorkoutParamsSchema,
            body: UpdateWorkoutSchema
        }
    }, workoutsController.updateWorkout);

    fastify.delete<WorkoutParamsRequest>('/:workoutId', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: WorkoutParamsSchema
        }
    }, workoutsController.deleteWorkout);
}
