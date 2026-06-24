import type { FastifyInstance } from 'fastify';
import gymsController from 'src/modules/gyms/gyms-controller';
import type { CreateGymRequest, GymParamsRequest, ListGymsRequest, UpdateGymRequest } from 'src/modules/gyms/gyms-models';
import { CreateGymSchema, ListGymsQuerySchema, UpdateGymSchema } from 'src/modules/gyms/gyms-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function gymsRoutes
 * @description Defines the gym catalog routes (authenticated reads, administrator writes).
 */
export default function (fastify: FastifyInstance): void {
    const administrator = [fastify.authentication.authenticate, fastify.authentication.authorizeAdministrator];

    fastify.get<ListGymsRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListGymsQuerySchema
        }
    }, gymsController.listGyms);

    fastify.get<GymParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, gymsController.getGym);

    fastify.post<CreateGymRequest>('/', {
        preHandler: administrator,
        schema: {
            body: CreateGymSchema
        }
    }, gymsController.createGym);

    fastify.patch<UpdateGymRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema,
            body: UpdateGymSchema
        }
    }, gymsController.updateGym);

    fastify.delete<GymParamsRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema
        }
    }, gymsController.deleteGym);
}
