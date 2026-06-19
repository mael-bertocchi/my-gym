import type { PrismaClient } from 'prisma/generated/prisma/client';
import type { AzureAI } from 'src/plugins/azure-ai';
import type { Variables } from 'src/plugins/environment';
import 'fastify';

/**
 * @module fastify
 * @description Augments Fastify instance typing for the application
 */
declare module 'fastify' {
    /**
     * @interface FastifyInstance
     * @description Application-level custom Fastify decorations
     */
    interface FastifyInstance {
        variables: Variables;
        prisma: PrismaClient;
        ai: AzureAI;
    }
}
