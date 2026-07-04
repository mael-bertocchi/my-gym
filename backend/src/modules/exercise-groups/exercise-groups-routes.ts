import type { FastifyInstance } from 'fastify';
import exerciseGroupsController from 'src/modules/exercise-groups/exercise-groups-controller';
import type { CreateExerciseGroupRequest, ExerciseGroupParamsRequest, ListExerciseGroupsRequest, UpdateExerciseGroupRequest } from 'src/modules/exercise-groups/exercise-groups-models';
import { CreateExerciseGroupSchema, ListExerciseGroupsQuerySchema, UpdateExerciseGroupSchema } from 'src/modules/exercise-groups/exercise-groups-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function exerciseGroupsRoutes
 * @description Defines the caller's personal exercise-group catalog routes.
 */
export default function (fastify: FastifyInstance): void {
    const authenticated = [fastify.authentication.authenticate];

    fastify.get<ListExerciseGroupsRequest>('/', {
        preHandler: authenticated,
        schema: {
            querystring: ListExerciseGroupsQuerySchema
        }
    }, exerciseGroupsController.listExerciseGroups);

    fastify.get<ExerciseGroupParamsRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema
        }
    }, exerciseGroupsController.getExerciseGroup);

    fastify.post<CreateExerciseGroupRequest>('/', {
        preHandler: authenticated,
        schema: {
            body: CreateExerciseGroupSchema
        }
    }, exerciseGroupsController.createExerciseGroup);

    fastify.patch<UpdateExerciseGroupRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema,
            body: UpdateExerciseGroupSchema
        }
    }, exerciseGroupsController.updateExerciseGroup);

    fastify.delete<ExerciseGroupParamsRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema
        }
    }, exerciseGroupsController.deleteExerciseGroup);
}
