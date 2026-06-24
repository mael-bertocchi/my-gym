import { randomUUID } from 'node:crypto';

import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { StatusCodes } from 'http-status-codes';
import { RequestError } from 'src/shared/models';

/**
 * @interface TokenPayload
 * @description The signed JWT payload. Refresh tokens additionally carry the id of their persisted session.
 */
export interface TokenPayload {
    id: string; /*!< The user's unique identifier */
    type: 'access' | 'refresh'; /*!< Distinguishes an access token from a refresh token */
    sid?: string; /*!< Refresh-session id, present on refresh tokens only */
}

/**
 * @interface AuthTokens
 * @description A freshly minted access/refresh token pair.
 */
export interface AuthTokens {
    accessToken: string; /*!< Short-lived bearer access token */
    refreshToken: string; /*!< Long-lived refresh token, backed by a persisted session */
}

/**
 * @interface Authentication
 * @description Public interface exposed on the Fastify instance.
 */
export interface Authentication {
    issueTokens: (userId: string) => Promise<AuthTokens>; /*!< Creates a refresh session and returns a token pair */
    rotateTokens: (refreshToken: string) => Promise<AuthTokens>; /*!< Validates and rotates a refresh token into a new pair */
    revokeSession: (userId: string, refreshToken: string) => Promise<void>; /*!< Invalidates a single refresh session (logout) */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>; /*!< preHandler guarding a route with a bearer access token */
    authorizeAdministrator: (request: FastifyRequest, reply: FastifyReply) => Promise<void>; /*!< preHandler (after authenticate) requiring an active administrator */
}

/**
 * @function authenticationPlugin
 * @description Registers JWT signing/verification, persisted refresh sessions, and the route guards.
 */
export default fp(async function (fastify: FastifyInstance): Promise<void> {
    await fastify.register(fastifyJwt, {
        secret: fastify.variables.JWT_SECRET
    });

    /**
     * @function verifyRefresh
     * @description Verifies a refresh token's signature and shape, returning its user and session ids.
     */
    const verifyRefresh = (token: string): { id: string; sid: string } => {
        let payload: TokenPayload;

        try {
            payload = fastify.jwt.verify<TokenPayload>(token);
        } catch {
            throw new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid or expired refresh token');
        }

        if (payload.type !== 'refresh' || payload.sid === undefined) {
            throw new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token');
        }

        return { id: payload.id, sid: payload.sid };
    };

    /**
     * @function issueTokens
     * @description Persists a new refresh session and returns the matching access/refresh token pair.
     */
    const issueTokens = async (userId: string): Promise<AuthTokens> => {
        const sid = randomUUID();
        const refreshToken = fastify.jwt.sign({ id: userId, type: 'refresh', sid }, { expiresIn: fastify.variables.JWT_REFRESH_EXPIRY });
        const decoded = fastify.jwt.decode<{ exp: number }>(refreshToken);
        const expiresAt = decoded !== null ? new Date(decoded.exp * 1000) : new Date();

        await fastify.prisma.refreshSession.create({ data: { id: sid, userId, expiresAt } });

        const accessToken = fastify.jwt.sign({ id: userId, type: 'access' }, { expiresIn: fastify.variables.JWT_ACCESS_EXPIRY });

        return { accessToken, refreshToken };
    };

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
        issueTokens,

        async rotateTokens(refreshToken: string): Promise<AuthTokens> {
            const { id, sid } = verifyRefresh(refreshToken);

            const session = await fastify.prisma.refreshSession.findUnique({ where: { id: sid } });

            if (session === null || session.userId !== id || session.expiresAt.getTime() <= Date.now()) {
                throw new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid or expired refresh token');
            }

            const user = await fastify.prisma.user.findUnique({ where: { id }, select: { isActive: true } });

            if (user === null || !user.isActive) {
                throw new RequestError(StatusCodes.UNAUTHORIZED, 'Account is inactive');
            }

            await fastify.prisma.refreshSession.delete({ where: { id: sid } });

            return await issueTokens(id);
        },

        async revokeSession(userId: string, refreshToken: string): Promise<void> {
            const { id, sid } = verifyRefresh(refreshToken);

            if (id !== userId) {
                throw new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token');
            }

            await fastify.prisma.refreshSession.deleteMany({ where: { id: sid, userId } });
        },

        authenticate,

        async authorizeAdministrator(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
            const user = await fastify.prisma.user.findUnique({
                where: { id: request.user.id },
                select: { isAdministrator: true, isActive: true }
            });

            if (user === null || !user.isActive) {
                throw new RequestError(StatusCodes.UNAUTHORIZED, 'Account is inactive');
            }

            if (!user.isAdministrator) {
                throw new RequestError(StatusCodes.FORBIDDEN, 'Administrator access required');
            }
        }
    });
}, {
    name: 'authentication',
    dependencies: ['environment', 'database']
});
