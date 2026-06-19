import type { FastifyInstance } from 'fastify';
import identityController from 'src/modules/identity/identity-controller';
import type { LoginRequest, RefreshRequest, UpdateProfileRequest } from 'src/modules/identity/identity-models';
import { LoginSchema, RefreshSchema, UpdateProfileSchema } from 'src/modules/identity/identity-models';

/**
 * @function identityRoutes
 * @description Defines the authentication and profile routes.
 */
export default function (fastify: FastifyInstance): void {
    fastify.post<LoginRequest>('/login', {
        schema: {
            body: LoginSchema
        }
    }, identityController.login);

    fastify.post<RefreshRequest>('/refresh', {
        schema: {
            body: RefreshSchema
        }
    }, identityController.refresh);

    fastify.get('/me', {
        preHandler: [fastify.authentication.authenticate]
    }, identityController.me);

    fastify.patch<UpdateProfileRequest>('/me', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: UpdateProfileSchema
        }
    }, identityController.updateMe);
}
