import type { FastifyInstance } from 'fastify';
import exerciseGroupsController from 'src/modules/exercise-groups/exercise-groups-controller';
import type { CreateExerciseGroupRequest, ExerciseGroupParamsRequest, ListExerciseGroupsRequest, UpdateExerciseGroupRequest } from 'src/modules/exercise-groups/exercise-groups-models';
import { CreateExerciseGroupSchema, ListExerciseGroupsQuerySchema, UpdateExerciseGroupSchema } from 'src/modules/exercise-groups/exercise-groups-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function exerciseGroupsRoutes
 * @description Defines the exercise-group catalog routes (authenticated reads, administrator writes).
 */
export default function (fastify: FastifyInstance): void {
    const administrator = [fastify.authentication.authenticate, fastify.authentication.authorizeAdministrator];

    fastify.get<ListExerciseGroupsRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListExerciseGroupsQuerySchema
        }
    }, exerciseGroupsController.listExerciseGroups);

    fastify.get<ExerciseGroupParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, exerciseGroupsController.getExerciseGroup);

    fastify.post<CreateExerciseGroupRequest>('/', {
        preHandler: administrator,
        schema: {
            body: CreateExerciseGroupSchema
        }
    }, exerciseGroupsController.createExerciseGroup);

    fastify.patch<UpdateExerciseGroupRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema,
            body: UpdateExerciseGroupSchema
        }
    }, exerciseGroupsController.updateExerciseGroup);

    fastify.delete<ExerciseGroupParamsRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema
        }
    }, exerciseGroupsController.deleteExerciseGroup);
}
