import type { FastifyInstance } from 'fastify';
import exerciseVariantsController from 'src/modules/exercise-variants/exercise-variants-controller';
import type { CreateExerciseVariantRequest, ExerciseVariantParamsRequest, ListExerciseVariantsRequest } from 'src/modules/exercise-variants/exercise-variants-models';
import { CreateExerciseVariantSchema, ListExerciseVariantsQuerySchema } from 'src/modules/exercise-variants/exercise-variants-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function exerciseVariantsRoutes
 * @description Defines the routes for managing exercise variants and their coaching content.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<ListExerciseVariantsRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListExerciseVariantsQuerySchema
        }
    }, exerciseVariantsController.listExerciseVariants);

    fastify.get<ExerciseVariantParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, exerciseVariantsController.getExerciseVariant);

    fastify.post<CreateExerciseVariantRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: CreateExerciseVariantSchema
        }
    }, exerciseVariantsController.createExerciseVariant);

    fastify.post<ExerciseVariantParamsRequest>('/:id/regenerate', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, exerciseVariantsController.regenerateExerciseVariant);

    fastify.delete<ExerciseVariantParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, exerciseVariantsController.deleteExerciseVariant);
}
