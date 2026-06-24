import type { FastifyInstance } from 'fastify';
import accountController from 'src/modules/account/account-controller';
import type { ChangePasswordRequest, UpdateProfileRequest } from 'src/modules/account/account-models';
import { ChangePasswordSchema, UpdateProfileSchema } from 'src/modules/account/account-models';

/**
 * @function accountRoutes
 * @description Defines the self-service account routes (display name, units, home gym, password).
 */
export default function (fastify: FastifyInstance): void {
    fastify.patch<UpdateProfileRequest>('/', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: UpdateProfileSchema
        }
    }, accountController.updateProfile);

    fastify.patch<ChangePasswordRequest>('/password', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: ChangePasswordSchema
        }
    }, accountController.changePassword);
}
