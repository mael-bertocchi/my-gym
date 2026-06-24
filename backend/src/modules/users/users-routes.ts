import type { FastifyInstance } from 'fastify';
import usersController from 'src/modules/users/users-controller';
import type { CreateUserRequest, ListUsersRequest, ResetPasswordRequest, UpdateUserRequest, UserParamsRequest } from 'src/modules/users/users-models';
import { CreateUserSchema, ListUsersQuerySchema, ResetPasswordSchema, UpdateUserSchema } from 'src/modules/users/users-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function usersRoutes
 * @description Defines the administrator-only account-management routes.
 */
export default function (fastify: FastifyInstance): void {
    const administrator = [fastify.authentication.authenticate, fastify.authentication.authorizeAdministrator];

    fastify.get<ListUsersRequest>('/', {
        preHandler: administrator,
        schema: {
            querystring: ListUsersQuerySchema
        }
    }, usersController.listUsers);

    fastify.post<CreateUserRequest>('/', {
        preHandler: administrator,
        schema: {
            body: CreateUserSchema
        }
    }, usersController.createUser);

    fastify.get<UserParamsRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema
        }
    }, usersController.getUser);

    fastify.patch<UpdateUserRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema,
            body: UpdateUserSchema
        }
    }, usersController.updateUser);

    fastify.post<ResetPasswordRequest>('/:id/reset-password', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema,
            body: ResetPasswordSchema
        }
    }, usersController.resetPassword);

    fastify.delete<UserParamsRequest>('/:id', {
        preHandler: administrator,
        schema: {
            params: UuidParamsSchema
        }
    }, usersController.deleteUser);
}
