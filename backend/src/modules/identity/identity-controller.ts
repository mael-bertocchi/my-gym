import argon2 from 'argon2';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { LoginRequest, RefreshRequest, UpdateProfileRequest } from 'src/modules/identity/identity-models';
import { RequestError } from 'src/shared/models';

/**
 * @constant PROFILE_SELECT
 * @description Shared field selection for the profile exposed by the API (never the password hash).
 */
const PROFILE_SELECT = {
    id: true,
    email: true,
    firstname: true,
    lastname: true,
    isAdministrator: true,
    weightUnit: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.UserSelect;

/**
 * @function login
 * @description Verifies email + password and returns a fresh access/refresh token pair.
 *
 * @returns {Promise<void>} Resolves when the tokens are sent.
 */
async function login(request: FastifyRequest<LoginRequest>, reply: FastifyReply): Promise<void> {
    const user = await request.server.prisma.user.findUnique({ where: { email: request.body.email } });

    if (user === null || !(await argon2.verify(user.passwordHash, request.body.password))) {
        throw new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
    }

    const accessToken = request.server.authentication.signAccessToken(user.id);
    const refreshToken = request.server.authentication.signRefreshToken(user.id);

    reply.status(StatusCodes.OK).send({ data: { accessToken, refreshToken } });
}

/**
 * @function refresh
 * @description Rotates an access/refresh token pair from a valid refresh token.
 *
 * @returns {Promise<void>} Resolves when the new tokens are sent.
 */
async function refresh(request: FastifyRequest<RefreshRequest>, reply: FastifyReply): Promise<void> {
    const userId = request.server.authentication.verifyRefreshToken(request.body.refreshToken);

    const user = await request.server.prisma.user.findUnique({ where: { id: userId } });

    if (user === null) {
        throw new RequestError(StatusCodes.UNAUTHORIZED, 'User not found');
    }

    const accessToken = request.server.authentication.signAccessToken(user.id);
    const refreshToken = request.server.authentication.signRefreshToken(user.id);

    reply.status(StatusCodes.OK).send({ data: { accessToken, refreshToken } });
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
        select: PROFILE_SELECT
    });

    if (user === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'User not found');
    }

    reply.status(StatusCodes.OK).send({ data: user });
}

/**
 * @function updateMe
 * @description Updates the authenticated user's name, password, and/or weight-unit preference.
 *
 * @returns {Promise<void>} Resolves when the updated profile is sent.
 */
async function updateMe(request: FastifyRequest<UpdateProfileRequest>, reply: FastifyReply): Promise<void> {
    const data: Prisma.UserUpdateInput = {};

    if (request.body.firstname !== undefined) {
        data.firstname = request.body.firstname;
    }
    if (request.body.lastname !== undefined) {
        data.lastname = request.body.lastname;
    }
    if (request.body.password !== undefined) {
        data.passwordHash = await argon2.hash(request.body.password);
    }
    if (request.body.weightUnit !== undefined) {
        data.weightUnit = request.body.weightUnit;
    }

    const user = await request.server.prisma.user.update({
        where: { id: request.user.id },
        data,
        select: PROFILE_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: user });
}

export default {
    login,
    refresh,
    me,
    updateMe
};
