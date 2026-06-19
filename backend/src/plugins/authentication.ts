import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { StatusCodes } from 'http-status-codes';
import { RequestError } from 'src/shared/models';

/**
 * @interface TokenPayload
 * @description The signed JWT payload for both access and refresh tokens.
 */
export interface TokenPayload {
    id: string; /*!< The user's unique identifier */
    type: 'access' | 'refresh'; /*!< Distinguishes an access token from a refresh token */
}

/**
 * @interface Authentication
 * @description Public interface exposed on the Fastify instance.
 */
export interface Authentication {
    signAccessToken: (userId: string) => string; /*!< Signs a short-lived access token */
    signRefreshToken: (userId: string) => string; /*!< Signs a long-lived refresh token */
    verifyRefreshToken: (token: string) => string; /*!< Verifies a refresh token and returns its user id */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>; /*!< preHandler guarding a route with a bearer access token */
}

/**
 * @function authenticationPlugin
 * @description Registers JWT signing/verification and the route authentication guard.
 */
export default fp(async function (fastify: FastifyInstance): Promise<void> {
    await fastify.register(fastifyJwt, {
        secret: fastify.variables.JWT_SECRET
    });

    const authenticate = async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
        try {
            await request.jwtVerify();
        } catch {
            throw new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid or expired access token');
        }

        if (request.user.type !== 'access') {
            throw new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid access token');
        }
    };

    fastify.decorate('authentication', {
        signAccessToken(userId: string): string {
            return fastify.jwt.sign({ id: userId, type: 'access' }, { expiresIn: fastify.variables.JWT_ACCESS_EXPIRY });
        },

        signRefreshToken(userId: string): string {
            return fastify.jwt.sign({ id: userId, type: 'refresh' }, { expiresIn: fastify.variables.JWT_REFRESH_EXPIRY });
        },

        verifyRefreshToken(token: string): string {
            let payload: TokenPayload;

            try {
                payload = fastify.jwt.verify<TokenPayload>(token);
            } catch {
                throw new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid or expired refresh token');
            }

            if (payload.type !== 'refresh') {
                throw new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token');
            }

            return payload.id;
        },

        authenticate
    });
}, {
    name: 'authentication',
    dependencies: ['environment', 'database']
});
