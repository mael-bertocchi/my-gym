import '@fastify/jwt';
import 'fastify';
import type { PrismaClient } from 'prisma/generated/prisma/client';
import type { Authentication, TokenPayload } from 'src/plugins/authentication';
import type { Variables } from 'src/plugins/environment';
import type { GoogleAI } from 'src/plugins/google-ai';

declare module '@fastify/jwt' {
    /**
     * @interface FastifyJWT
     * @description Defines the JWT payload and request.user shape.
     */
    interface FastifyJWT {
        payload: TokenPayload;
        user: TokenPayload;
    }
}

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
        authentication: Authentication;
        variables: Variables;
        prisma: PrismaClient;
        ai: GoogleAI;
    }
}
