import type { FastifyInstance } from 'fastify';
import gymLocationsController from 'src/modules/gym-locations/gym-locations-controller';
import type { CreateGymLocationRequest, GymLocationParamsRequest, ListGymLocationsRequest, UpdateGymLocationRequest } from 'src/modules/gym-locations/gym-locations-models';
import { CreateGymLocationSchema, ListGymLocationsQuerySchema, UpdateGymLocationSchema } from 'src/modules/gym-locations/gym-locations-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function gymLocationsRoutes
 * @description Defines the routes for managing the user's gym locations.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<ListGymLocationsRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListGymLocationsQuerySchema
        }
    }, gymLocationsController.listGymLocations);

    fastify.get<GymLocationParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, gymLocationsController.getGymLocation);

    fastify.post<CreateGymLocationRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: CreateGymLocationSchema
        }
    }, gymLocationsController.createGymLocation);

    fastify.patch<UpdateGymLocationRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            body: UpdateGymLocationSchema
        }
    }, gymLocationsController.updateGymLocation);

    fastify.delete<GymLocationParamsRequest>('/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, gymLocationsController.deleteGymLocation);
}
