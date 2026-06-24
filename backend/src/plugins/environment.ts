import fastifyEnv from '@fastify/env';
import { Type, type Static } from '@sinclair/typebox';
import addFormats from 'ajv-formats';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * @constant variables
 * @description JSON Schema definition for required environment variables, used for validation and type inference
 */
export const variables = Type.Object({
    NODE_ENV: Type.Union([Type.Literal('development'), Type.Literal('production'), Type.Literal('test')]),
    PORT: Type.Number(),
    CORS_ORIGINS: Type.String(),
    DATABASE_URL: Type.String({ minLength: 1 }),
    GOOGLE_AI_STUDIO_API_KEY: Type.String({ minLength: 1 }),
    GOOGLE_AI_MODEL: Type.String({ default: 'gemini-2.5-flash' }),
    ADMINISTRATOR_EMAIL: Type.String({ format: 'email' }),
    ADMINISTRATOR_PASSWORD: Type.String({ minLength: 8 }),
    JWT_SECRET: Type.String({ minLength: 32 }),
    JWT_ACCESS_EXPIRY: Type.String({ minLength: 1 }),
    JWT_REFRESH_EXPIRY: Type.String({ minLength: 1 })
});

/**
 * @type Variables
 * @description TypeScript type representing the shape of the environment variables, derived from schema
 */
export type Variables = Static<typeof variables>;

/**
 * @function environmentPlugin
 * @description Registers the environment variables plugin
 */
export default fp(async function (fastify: FastifyInstance): Promise<void> {
    await fastify.register(fastifyEnv, {
        confKey: 'variables',
        ajv: {
            customOptions(ajvInstance) {
                addFormats(ajvInstance);
                return ajvInstance;
            }
        },
        schema: variables,
        dotenv: true
    });
}, {
    name: 'environment'
});
