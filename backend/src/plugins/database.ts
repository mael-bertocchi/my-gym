import { PrismaPg } from '@prisma/adapter-pg';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from 'prisma/generated/prisma/client';

/**
 * @function databasePlugin
 * @description Registers and decorates the Prisma database client
 */
export default fp(async function (fastify: FastifyInstance): Promise<void> {
    const adapter = new PrismaPg({ connectionString: fastify.variables.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });

    await prisma.$connect();

    fastify.log.info('Database connected');

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async () => {
        await prisma.$disconnect();
    });
}, {
    name: 'database',
    dependencies: ['environment']
});
