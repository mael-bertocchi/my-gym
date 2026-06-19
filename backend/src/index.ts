import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Fastify from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { hasZodFastifySchemaValidationErrors, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { StatusCodes } from 'http-status-codes';
import exerciseVariantsRoutes from 'src/modules/exercise-variants/exercise-variants-routes';
import exercisesRoutes from 'src/modules/exercises/exercises-routes';
import gymBrandsRoutes from 'src/modules/gym-brands/gym-brands-routes';
import healthRoutes from 'src/modules/health/health-routes';
import identityRoutes from 'src/modules/identity/identity-routes';
import machineBrandsRoutes from 'src/modules/machine-brands/machine-brands-routes';
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

    await fastify.register(exerciseVariantsRoutes, { prefix: '/v1/exercise-variants' });
    await fastify.register(exercisesRoutes, { prefix: '/v1/exercises' });
    await fastify.register(gymBrandsRoutes, { prefix: '/v1/gym-brands' });
    await fastify.register(healthRoutes, { prefix: '/v1/health' });
    await fastify.register(identityRoutes, { prefix: '/v1/identity' });
    await fastify.register(machineBrandsRoutes, { prefix: '/v1/machine-brands' });

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
