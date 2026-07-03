import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Fastify from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { hasZodFastifySchemaValidationErrors, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { StatusCodes } from 'http-status-codes';
import accountRoutes from 'src/modules/account/account-routes';
import assistantRoutes from 'src/modules/assistant/assistant-routes';
import brandsRoutes from 'src/modules/brands/brands-routes';
import exerciseGroupsRoutes from 'src/modules/exercise-groups/exercise-groups-routes';
import exerciseSettingsRoutes from 'src/modules/exercise-settings/exercise-settings-routes';
import exercisesRoutes from 'src/modules/exercises/exercises-routes';
import gymsRoutes from 'src/modules/gyms/gyms-routes';
import healthRoutes from 'src/modules/health/health-routes';
import identityRoutes from 'src/modules/identity/identity-routes';
import setsRoutes from 'src/modules/sets/sets-routes';
import statsRoutes from 'src/modules/stats/stats-routes';
import syncRoutes from 'src/modules/sync/sync-routes';
import usersRoutes from 'src/modules/users/users-routes';
import workoutExercisesRoutes from 'src/modules/workout-exercises/workout-exercises-routes';
import workoutsRoutes from 'src/modules/workouts/workouts-routes';
import administratorPlugin from 'src/plugins/administrator';
import authenticationPlugin from 'src/plugins/authentication';
import databasePlugin from 'src/plugins/database';
import environmentPlugin from 'src/plugins/environment';
import googleAIPlugin from 'src/plugins/google-ai';
import securityPlugin from 'src/plugins/security';
import type { RequestErrorResponse } from 'src/shared/models';
import { RequestError } from 'src/shared/models';
import { ZodError } from 'zod';

/**
 * @constant fastify
 * @description Main Fastify application instance
 */
const fastify: FastifyInstance = Fastify({
    bodyLimit: 10 * 1024 * 1024,
    keepAliveTimeout: 5 * 1000,
    logger: {
        transport: {
            target: 'pino-pretty'
        }
    }
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

/**
 * @function handleGlobalError
 * @description Handles all unhandled route and runtime errors
 */
function handleGlobalError(err: Error, request: FastifyRequest, reply: FastifyReply): FastifyReply {
    let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    const response: RequestErrorResponse = {
        message: 'Server Error',
        data: undefined
    };

    if (err instanceof RequestError) {
        statusCode = err.code;
        response.message = err.message;
        response.data = err.data;
    } else if (err instanceof ZodError) {
        statusCode = StatusCodes.BAD_REQUEST;
        response.message = 'Validation failed';
        response.data = { issues: err.issues };
    } else if (hasZodFastifySchemaValidationErrors(err)) {
        statusCode = StatusCodes.BAD_REQUEST;
        response.message = 'Validation failed';
        response.data = { issues: err.validation };
    } else if ('validation' in err) {
        statusCode = StatusCodes.BAD_REQUEST;
        response.message = 'Validation Error';
        response.data = err.validation;
    } else if ('statusCode' in err) {
        const errorStatusCode = err.statusCode;

        if (typeof errorStatusCode === 'number') {
            statusCode = errorStatusCode;
        }

        response.message = err.message;
    }

    if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
        request.log.error({ error: { message: err.message, stack: err.stack, type: err.name }, path: request.url }, 'Server Error');
        if (process.env.NODE_ENV !== 'production') {
            response.data = err.stack;
        } else {
            response.message = 'Server Error';
        }
    } else {
        request.log.warn({ message: err.message, code: statusCode, path: request.url }, 'Client Error');
    }

    request.log.info({ response, statusCode }, 'Response Sent');

    return reply.status(statusCode).send(response);
}

/**
 * @function handleNotFound
 * @description Handles requests to unknown endpoints
 */
function handleNotFound(request: FastifyRequest, reply: FastifyReply): FastifyReply {
    return reply.status(StatusCodes.NOT_FOUND).send({
        message: "The resource you are looking for doesn't exist",
        data: {
            method: request.method,
            path: request.url
        }
    });
}

/**
 * @function startServer
 * @description Registers plugins, routes, and starts the HTTP server
 */
async function startServer(): Promise<void> {
    await fastify.register(environmentPlugin);
    await fastify.register(securityPlugin);
    await fastify.register(databasePlugin);
    await fastify.register(authenticationPlugin);
    await fastify.register(administratorPlugin);
    await fastify.register(googleAIPlugin);

    fastify.setErrorHandler(handleGlobalError);

    await fastify.register(accountRoutes, { prefix: '/api/v1/me' });
    await fastify.register(assistantRoutes, { prefix: '/api/v1/assistant' });
    await fastify.register(brandsRoutes, { prefix: '/api/v1/brands' });
    await fastify.register(exerciseGroupsRoutes, { prefix: '/api/v1/exercise-groups' });
    await fastify.register(exerciseSettingsRoutes, { prefix: '/api/v1/exercise-settings' });
    await fastify.register(exercisesRoutes, { prefix: '/api/v1/exercises' });
    await fastify.register(gymsRoutes, { prefix: '/api/v1/gyms' });
    await fastify.register(healthRoutes, { prefix: '/api/v1/health' });
    await fastify.register(identityRoutes, { prefix: '/api/v1/identity' });
    await fastify.register(statsRoutes, { prefix: '/api/v1/stats' });
    await fastify.register(syncRoutes, { prefix: '/api/v1/sync' });
    await fastify.register(usersRoutes, { prefix: '/api/v1/users' });
    await fastify.register(workoutsRoutes, { prefix: '/api/v1/workouts' });
    await fastify.register(workoutExercisesRoutes, { prefix: '/api/v1/workouts' });
    await fastify.register(setsRoutes, { prefix: '/api/v1/workouts' });

    fastify.setNotFoundHandler(handleNotFound);

    try {
        await fastify.listen({
            port: fastify.variables.PORT,
            host: '0.0.0.0'
        });
    } catch (err: unknown) {
        fastify.log.error(err);
        process.exit(1);
    }
}

await startServer();
