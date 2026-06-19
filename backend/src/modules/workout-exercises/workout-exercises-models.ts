import type { RequestGenericInterface } from 'fastify';
import { z } from 'zod';

/**
 * @constant CreateWorkoutExerciseSchema
 * @description Zod schema for the create-workout-exercise request body. position defaults to next in the controller.
 */
export const CreateWorkoutExerciseSchema = z.object({
    workoutId: z.uuid(),
    exerciseVariantId: z.uuid(),
    position: z.number().int().positive().optional(),
    notes: z.string().max(2000).optional()
});

/**
 * @type CreateWorkoutExerciseBody
 * @description Inferred body type for the create-workout-exercise endpoint.
 */
export type CreateWorkoutExerciseBody = z.infer<typeof CreateWorkoutExerciseSchema>;

/**
 * @constant UpdateWorkoutExerciseSchema
 * @description Zod schema for the update-workout-exercise request body. Each field is optional, but at least one must be provided.
 */
export const UpdateWorkoutExerciseSchema = z.object({
    position: z.number().int().positive().optional(),
    notes: z.string().max(2000).optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateWorkoutExerciseBody
 * @description Inferred body type for the update-workout-exercise endpoint.
 */
export type UpdateWorkoutExerciseBody = z.infer<typeof UpdateWorkoutExerciseSchema>;

/**
 * @interface CreateWorkoutExerciseRequest
 * @description Fastify request generic for creating a workout exercise.
 *
 * @extends RequestGenericInterface
 */
export interface CreateWorkoutExerciseRequest extends RequestGenericInterface {
    Body: CreateWorkoutExerciseBody; /*!< Validated create-workout-exercise body */
}

/**
 * @interface UpdateWorkoutExerciseRequest
 * @description Fastify request generic for updating a workout exercise.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateWorkoutExerciseRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Workout exercise identifier */
    };
    Body: UpdateWorkoutExerciseBody; /*!< Validated update-workout-exercise body */
}

/**
 * @interface WorkoutExerciseParamsRequest
 * @description Fastify request generic for operations targeting a single workout exercise by id.
 *
 * @extends RequestGenericInterface
 */
export interface WorkoutExerciseParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Workout exercise identifier */
    };
}
