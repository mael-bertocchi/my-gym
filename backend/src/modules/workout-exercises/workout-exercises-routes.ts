import type { FastifyInstance } from 'fastify';
import workoutExercisesController from 'src/modules/workout-exercises/workout-exercises-controller';
import type { CreateWorkoutExerciseRequest, UpdateWorkoutExerciseRequest, WorkoutExerciseParamsRequest } from 'src/modules/workout-exercises/workout-exercises-models';
import { CreateWorkoutExerciseSchema, UpdateWorkoutExerciseSchema, WorkoutExerciseCreateParamsSchema, WorkoutExerciseParamsSchema } from 'src/modules/workout-exercises/workout-exercises-models';

/**
 * @function workoutExercisesRoutes
 * @description Defines the routes for managing exercises nested within a workout.
 */
export default function (fastify: FastifyInstance): void {
    fastify.post<CreateWorkoutExerciseRequest>('/:workoutId/exercises', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: WorkoutExerciseCreateParamsSchema,
            body: CreateWorkoutExerciseSchema
        }
    }, workoutExercisesController.createWorkoutExercise);

    fastify.patch<UpdateWorkoutExerciseRequest>('/:workoutId/exercises/:workoutExerciseId', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: WorkoutExerciseParamsSchema,
            body: UpdateWorkoutExerciseSchema
        }
    }, workoutExercisesController.updateWorkoutExercise);

    fastify.delete<WorkoutExerciseParamsRequest>('/:workoutId/exercises/:workoutExerciseId', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: WorkoutExerciseParamsSchema
        }
    }, workoutExercisesController.deleteWorkoutExercise);
}
