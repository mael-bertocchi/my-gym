import argon2 from 'argon2';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateUserRequest, ListUsersRequest, ResetPasswordRequest, UpdateUserRequest, UserParamsRequest } from 'src/modules/users/users-models';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

/**
 * @function listUsers
 * @description Lists all accounts with optional search and cursor pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listUsers(request: FastifyRequest<ListUsersRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const where: Prisma.UserWhereInput = {};

    if (request.query.search !== undefined && request.query.search.trim().length !== 0) {
        const term = request.query.search.trim();
        where.OR = [
            { email: { contains: term, mode: 'insensitive' } },
            { displayName: { contains: term, mode: 'insensitive' } }
        ];
    }

    const rows = await request.server.prisma.user.findMany({
        where,
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
        },
        orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
        take,
        cursor,
        skip
    });

    reply.status(StatusCodes.OK).send(buildCursorPage(rows, limit));
}

/**
 * @function getUser
 * @description Retrieves a single account.
 *
 * @returns {Promise<void>} Resolves when the account is sent.
 */
async function getUser(request: FastifyRequest<UserParamsRequest>, reply: FastifyReply): Promise<void> {
    const user = await request.server.prisma.user.findUnique({
        where: { id: request.params.id },
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

/**
 * @function createUser
 * @description Creates an account with a hashed password.
 *
 * @returns {Promise<void>} Resolves when the account is created.
 */
async function createUser(request: FastifyRequest<CreateUserRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.user.findUnique({ where: { email: request.body.email } });

    if (existing !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'An account with this email already exists');
    }

    const passwordHash = await argon2.hash(request.body.password);

    const created = await request.server.prisma.user.create({
        data: {
            email: request.body.email,
            passwordHash,
            displayName: request.body.displayName,
            isAdministrator: request.body.isAdministrator,
            weightUnit: request.body.weightUnit
        },
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

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateUser
 * @description Updates an account's role, display name, units, or active state. Only the provided fields change.
 *
 * @returns {Promise<void>} Resolves when the account is updated.
 */
async function updateUser(request: FastifyRequest<UpdateUserRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.user.findUnique({ where: { id: request.params.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'User not found');
    }

    const isSelf = request.params.id === request.user.id;

    if (isSelf && request.body.isAdministrator === false) {
        throw new RequestError(StatusCodes.BAD_REQUEST, 'You cannot remove your own administrator role');
    }
    if (isSelf && request.body.isActive === false) {
        throw new RequestError(StatusCodes.BAD_REQUEST, 'You cannot deactivate your own account');
    }

    const data: Prisma.UserUncheckedUpdateInput = {};

    if (request.body.displayName !== undefined) {
        data.displayName = request.body.displayName;
    }
    if (request.body.isAdministrator !== undefined) {
        data.isAdministrator = request.body.isAdministrator;
    }
    if (request.body.isActive !== undefined) {
        data.isActive = request.body.isActive;
    }
    if (request.body.weightUnit !== undefined) {
        data.weightUnit = request.body.weightUnit;
    }

    const updated = await request.server.prisma.user.update({
        where: { id: request.params.id },
        data,
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

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function resetPassword
 * @description Sets a new password for an account and revokes its refresh sessions.
 *
 * @returns {Promise<void>} Resolves when the password is reset.
 */
async function resetPassword(request: FastifyRequest<ResetPasswordRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.user.findUnique({ where: { id: request.params.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'User not found');
    }

    const passwordHash = await argon2.hash(request.body.newPassword);

    await request.server.prisma.$transaction([
        request.server.prisma.user.update({ where: { id: request.params.id }, data: { passwordHash } }),
        request.server.prisma.refreshSession.deleteMany({ where: { userId: request.params.id } })
    ]);

    reply.status(StatusCodes.OK).send({ data: { message: 'Password reset' } });
}

/**
 * @function deleteUser
 * @description Deactivates an account (soft delete) and revokes its refresh sessions, preserving its history.
 *
 * @returns {Promise<void>} Resolves when the account is deactivated.
 */
async function deleteUser(request: FastifyRequest<UserParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.user.findUnique({ where: { id: request.params.id } });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (request.params.id === request.user.id) {
        throw new RequestError(StatusCodes.BAD_REQUEST, 'You cannot deactivate your own account');
    }

    await request.server.prisma.$transaction([
        request.server.prisma.user.update({ where: { id: request.params.id }, data: { isActive: false } }),
        request.server.prisma.refreshSession.deleteMany({ where: { userId: request.params.id } })
    ]);

    reply.status(StatusCodes.OK).send({ data: { message: 'Account deactivated' } });
}

export default {
    listUsers,
    getUser,
    createUser,
    updateUser,
    resetPassword,
    deleteUser
};
