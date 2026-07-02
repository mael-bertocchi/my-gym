import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * @function administratorPlugin
 * @description Reconciles the administrator account from the configured email and password on every boot.
 */
export default fp(async function (fastify: FastifyInstance): Promise<void> {
    const email = fastify.variables.ADMINISTRATOR_EMAIL;
    const displayName = fastify.variables.ADMINISTRATOR_DISPLAY_NAME;
    const passwordHash = await argon2.hash(fastify.variables.ADMINISTRATOR_PASSWORD);

    await fastify.prisma.user.upsert({
        where: { email },
        update: { passwordHash, isAdministrator: true, isActive: true },
        create: { email, passwordHash, displayName, isAdministrator: true, isActive: true }
    });

    fastify.log.info({ email }, 'Reconciled the administrator account');
}, {
    name: 'administrator',
    dependencies: ['database']
});
