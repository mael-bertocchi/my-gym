import type { RequestGenericInterface } from 'fastify';
import { SettingsSchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant WorkoutExerciseCreateParamsSchema
 * @description Zod schema for route params when adding an exercise to a workout.
 */
export const WorkoutExerciseCreateParamsSchema = z.object({
    workoutId: z.uuid()
});

/**
 * @constant WorkoutExerciseParamsSchema
 * @description Zod schema for route params identifying a single workout exercise.
 */
export const WorkoutExerciseParamsSchema = z.object({
    workoutId: z.uuid(),
    workoutExerciseId: z.uuid()
});

/**
 * @constant CreateWorkoutExerciseSchema
 * @description Zod schema for the add-exercise request body. position defaults to next in the controller.
 */
export const CreateWorkoutExerciseSchema = z.object({
    exerciseId: z.uuid(),
    position: z.number().int().positive().optional(),
    notes: z.string().max(2000).optional(),
    settings: SettingsSchema.optional()
});

/**
 * @type CreateWorkoutExerciseBody
 * @description Inferred body type for the add-exercise endpoint.
 */
export type CreateWorkoutExerciseBody = z.infer<typeof CreateWorkoutExerciseSchema>;

/**
 * @constant UpdateWorkoutExerciseSchema
 * @description Zod schema for the update-workout-exercise request body. Each field is optional, but at least one must be provided. A null notes/settings clears that field.
 */
export const UpdateWorkoutExerciseSchema = z.object({
    position: z.number().int().positive().optional(),
    notes: z.string().max(2000).nullable().optional(),
    settings: SettingsSchema.nullable().optional()
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
 * @description Fastify request generic for adding an exercise to a workout.
 *
 * @extends RequestGenericInterface
 */
export interface CreateWorkoutExerciseRequest extends RequestGenericInterface {
    Params: {
        workoutId: string; /*!< Workout identifier */
    };
    Body: CreateWorkoutExerciseBody; /*!< Validated add-exercise body */
}

/**
 * @interface UpdateWorkoutExerciseRequest
 * @description Fastify request generic for updating a workout exercise.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateWorkoutExerciseRequest extends RequestGenericInterface {
    Params: {
        workoutId: string; /*!< Workout identifier */
        workoutExerciseId: string; /*!< Workout exercise identifier */
    };
    Body: UpdateWorkoutExerciseBody; /*!< Validated update-workout-exercise body */
}

/**
 * @interface WorkoutExerciseParamsRequest
 * @description Fastify request generic for operations targeting a single workout exercise.
 *
 * @extends RequestGenericInterface
 */
export interface WorkoutExerciseParamsRequest extends RequestGenericInterface {
    Params: {
        workoutId: string; /*!< Workout identifier */
        workoutExerciseId: string; /*!< Workout exercise identifier */
    };
}
