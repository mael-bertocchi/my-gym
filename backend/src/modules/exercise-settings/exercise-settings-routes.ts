import type { FastifyInstance } from 'fastify';
import exerciseSettingsController from 'src/modules/exercise-settings/exercise-settings-controller';
import type { ExerciseSettingParamsRequest, ListExerciseSettingsRequest, UpsertExerciseSettingRequest } from 'src/modules/exercise-settings/exercise-settings-models';
import { ListExerciseSettingsQuerySchema, UpsertExerciseSettingSchema } from 'src/modules/exercise-settings/exercise-settings-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function exerciseSettingsRoutes
 * @description Defines the caller's remembered-settings routes.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<ListExerciseSettingsRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListExerciseSettingsQuerySchema
        }
    }, exerciseSettingsController.listExerciseSettings);

    fastify.put<UpsertExerciseSettingRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: UpsertExerciseSettingSchema
        }
    }, exerciseSettingsController.upsertExerciseSetting);

    fastify.delete<ExerciseSettingParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, exerciseSettingsController.deleteExerciseSetting);
}
