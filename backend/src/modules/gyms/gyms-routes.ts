import type { FastifyInstance } from 'fastify';
import gymsController from 'src/modules/gyms/gyms-controller';
import type { CreateGymRequest, GymParamsRequest, ListGymsRequest, UpdateGymRequest } from 'src/modules/gyms/gyms-models';
import { CreateGymSchema, ListGymsQuerySchema, UpdateGymSchema } from 'src/modules/gyms/gyms-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function gymsRoutes
 * @description Defines the caller's personal gym catalog routes.
 */
export default function (fastify: FastifyInstance): void {
    const authenticated = [fastify.authentication.authenticate];

    fastify.get<ListGymsRequest>('/', {
        preHandler: authenticated,
        schema: {
            querystring: ListGymsQuerySchema
        }
    }, gymsController.listGyms);

    fastify.get<GymParamsRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema
        }
    }, gymsController.getGym);

    fastify.post<CreateGymRequest>('/', {
        preHandler: authenticated,
        schema: {
            body: CreateGymSchema
        }
    }, gymsController.createGym);

    fastify.patch<UpdateGymRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema,
            body: UpdateGymSchema
        }
    }, gymsController.updateGym);

    fastify.delete<GymParamsRequest>('/:id', {
        preHandler: authenticated,
        schema: {
            params: UuidParamsSchema
        }
    }, gymsController.deleteGym);
}
