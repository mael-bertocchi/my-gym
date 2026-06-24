import type { FastifyInstance } from 'fastify';
import identityController from 'src/modules/identity/identity-controller';
import type { LoginRequest, LogoutRequest, RefreshRequest } from 'src/modules/identity/identity-models';
import { LoginSchema, LogoutSchema, RefreshSchema } from 'src/modules/identity/identity-models';

/**
 * @function identityRoutes
 * @description Defines the authentication routes.
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

    fastify.post<LogoutRequest>('/logout', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: LogoutSchema
        }
    }, identityController.logout);

    fastify.get('/me', {
        preHandler: [fastify.authentication.authenticate]
    }, identityController.me);
}
