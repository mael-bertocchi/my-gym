import type { FastifyInstance } from 'fastify';
import workoutExercisesController from 'src/modules/workout-exercises/workout-exercises-controller';
import { CreateWorkoutExerciseSchema, UpdateWorkoutExerciseSchema } from 'src/modules/workout-exercises/workout-exercises-models';
import type { CreateWorkoutExerciseRequest, UpdateWorkoutExerciseRequest, WorkoutExerciseParamsRequest } from 'src/modules/workout-exercises/workout-exercises-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function workoutExercisesRoutes
 * @description Defines the routes for managing exercises within a workout.
 */
export default function (fastify: FastifyInstance): void {
    fastify.post<CreateWorkoutExerciseRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: CreateWorkoutExerciseSchema
        }
    }, workoutExercisesController.createWorkoutExercise);

    fastify.patch<UpdateWorkoutExerciseRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            body: UpdateWorkoutExerciseSchema
        }
    }, workoutExercisesController.updateWorkoutExercise);

    fastify.delete<WorkoutExerciseParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, workoutExercisesController.deleteWorkoutExercise);
}
