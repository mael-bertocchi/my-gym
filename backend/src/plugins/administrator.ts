import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * @function administratorPlugin
 * @description Seeds the single administrator account at boot from the configured email and password.
 */
export default fp(async function (fastify: FastifyInstance): Promise<void> {
    const email = fastify.variables.ADMINISTRATOR_EMAIL;
    const existing = await fastify.prisma.user.findUnique({ where: { email } });

    if (existing === null) {
        const passwordHash = await argon2.hash(fastify.variables.ADMINISTRATOR_PASSWORD);
        await fastify.prisma.user.create({
            data: { email, passwordHash, firstname: 'Admin', lastname: 'Account', isAdministrator: true }
        });
        fastify.log.info({ email }, 'Seeded the administrator account');
    }
}, {
    name: 'administrator',
    dependencies: ['database']
});
