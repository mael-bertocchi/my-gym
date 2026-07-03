import argon2 from 'argon2';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { LoginRequest, LogoutRequest, RefreshRequest } from 'src/modules/identity/identity-models';
import { RequestError } from 'src/shared/models';

/**
 * @function login
 * @description Verifies email + password for an active account and returns a fresh access/refresh token pair.
 *
 * @returns {Promise<void>} Resolves when the tokens are sent.
 */
async function login(request: FastifyRequest<LoginRequest>, reply: FastifyReply): Promise<void> {
    const user = await request.server.prisma.user.findUnique({ where: { email: request.body.email } });

    if (user === null || !user.isActive || !(await argon2.verify(user.passwordHash, request.body.password))) {
        throw new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
    }

    const tokens = await request.server.authentication.issueTokens(user.id);

    reply.status(StatusCodes.OK).send({ data: tokens });
}

/**
 * @function refresh
 * @description Rotates an access/refresh token pair from a valid refresh token.
 *
 * @returns {Promise<void>} Resolves when the new tokens are sent.
 */
async function refresh(request: FastifyRequest<RefreshRequest>, reply: FastifyReply): Promise<void> {
    const tokens = await request.server.authentication.rotateTokens(request.body.refreshToken);

    reply.status(StatusCodes.OK).send({ data: tokens });
}

/**
 * @function logout
 * @description Invalidates the caller's current refresh token.
 *
 * @returns {Promise<void>} Resolves when the session is revoked.
 */
async function logout(request: FastifyRequest<LogoutRequest>, reply: FastifyReply): Promise<void> {
    await request.server.authentication.revokeSession(request.user.id, request.body.refreshToken);

    reply.status(StatusCodes.OK).send({ data: { message: 'Logged out' } });
}

/**
 * @function me
 * @description Returns the authenticated user's profile.
 *
 * @returns {Promise<void>} Resolves when the profile is sent.
 */
async function me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = await request.server.prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
            id: true,
            email: true,
            displayName: true,
            isAdministrator: true,
            isActive: true,
            weightUnit: true,
            defaultGymId: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (user === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'User not found');
    }

    reply.status(StatusCodes.OK).send({ data: user });
}

export default {
    login,
    refresh,
    logout,
    me
};
