import argon2 from 'argon2';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { ChangePasswordRequest, UpdateProfileRequest } from 'src/modules/account/account-models';
import { RequestError } from 'src/shared/models';

/**
 * @constant PROFILE_SELECT
 * @description Shared field selection for the profile exposed by the API (never the password hash).
 */
const PROFILE_SELECT = {
    id: true,
    email: true,
    displayName: true,
    isAdministrator: true,
    isActive: true,
    weightUnit: true,
    defaultGymId: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.UserSelect;

/**
 * @function updateProfile
 * @description Updates the authenticated user's display name, units preference, and/or home gym. Only provided fields change.
 *
 * @returns {Promise<void>} Resolves when the updated profile is sent.
 */
async function updateProfile(request: FastifyRequest<UpdateProfileRequest>, reply: FastifyReply): Promise<void> {
    const data: Prisma.UserUncheckedUpdateInput = {};

    if (request.body.displayName !== undefined) {
        data.displayName = request.body.displayName;
    }
    if (request.body.weightUnit !== undefined) {
        data.weightUnit = request.body.weightUnit;
    }
    if (request.body.defaultGymId !== undefined) {
        if (request.body.defaultGymId !== null) {
            const gym = await request.server.prisma.gym.findUnique({ where: { id: request.body.defaultGymId } });

            if (gym === null) {
                throw new RequestError(StatusCodes.NOT_FOUND, 'Gym not found');
            }
        }
        data.defaultGymId = request.body.defaultGymId;
    }

    const user = await request.server.prisma.user.update({
        where: { id: request.user.id },
        data,
        select: PROFILE_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: user });
}

/**
 * @function changePassword
 * @description Changes the authenticated user's password after verifying the current one, then revokes every refresh session.
 *
 * @returns {Promise<void>} Resolves when the password is changed.
 */
async function changePassword(request: FastifyRequest<ChangePasswordRequest>, reply: FastifyReply): Promise<void> {
    const user = await request.server.prisma.user.findUnique({ where: { id: request.user.id } });

    if (user === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (!(await argon2.verify(user.passwordHash, request.body.currentPassword))) {
        throw new RequestError(StatusCodes.UNAUTHORIZED, 'Current password is incorrect');
    }

    const passwordHash = await argon2.hash(request.body.newPassword);

    await request.server.prisma.$transaction([
        request.server.prisma.user.update({ where: { id: request.user.id }, data: { passwordHash } }),
        request.server.prisma.refreshSession.deleteMany({ where: { userId: request.user.id } })
    ]);

    reply.status(StatusCodes.OK).send({ data: { message: 'Password changed' } });
}

export default {
    updateProfile,
    changePassword
};
