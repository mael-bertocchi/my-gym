import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { SyncEntityType, type Prisma } from 'prisma/generated/prisma/client';
import type { ExerciseSettingParamsRequest, ListExerciseSettingsRequest, UpsertExerciseSettingRequest } from 'src/modules/exercise-settings/exercise-settings-models';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

/**
 * @function listExerciseSettings
 * @description Lists the caller's remembered settings with an optional exercise filter and cursor pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listExerciseSettings(request: FastifyRequest<ListExerciseSettingsRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const where: Prisma.ExerciseSettingWhereInput = { userId: request.user.id };

    if (request.query.exerciseId !== undefined) {
        where.exerciseId = request.query.exerciseId;
    }

    const rows = await request.server.prisma.exerciseSetting.findMany({
        where,
        select: {
            id: true,
            exerciseId: true,
            settings: true,
            createdAt: true,
            updatedAt: true
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take,
        cursor,
        skip
    });

    reply.status(StatusCodes.OK).send(buildCursorPage(rows, limit));
}

/**
 * @function upsertExerciseSetting
 * @description Creates or replaces the caller's remembered settings for an exercise.
 *
 * @returns {Promise<void>} Resolves when the settings are saved.
 */
async function upsertExerciseSetting(request: FastifyRequest<UpsertExerciseSettingRequest>, reply: FastifyReply): Promise<void> {
    const exercise = await request.server.prisma.exercise.findFirst({ where: { id: request.body.exerciseId, userId: request.user.id } });

    if (exercise === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise not found');
    }

    const settings = request.body.settings as unknown as Prisma.InputJsonValue;

    const saved = await request.server.prisma.exerciseSetting.upsert({
        where: {
            userId_exerciseId: { userId: request.user.id, exerciseId: request.body.exerciseId }
        },
        update: { settings },
        create: { userId: request.user.id, exerciseId: request.body.exerciseId, settings },
        select: {
            id: true,
            exerciseId: true,
            settings: true,
            createdAt: true,
            updatedAt: true
        }
    });

    reply.status(StatusCodes.OK).send({ data: saved });
}

/**
 * @function deleteExerciseSetting
 * @description Clears one of the caller's remembered settings.
 *
 * @returns {Promise<void>} Resolves when the setting is deleted.
 */
async function deleteExerciseSetting(request: FastifyRequest<ExerciseSettingParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exerciseSetting.findFirst({
        where: { id: request.params.id, userId: request.user.id }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise setting not found');
    }

    await request.server.prisma.$transaction([
        request.server.prisma.exerciseSetting.delete({ where: { id: request.params.id } }),
        request.server.prisma.syncDeletion.create({
            data: { userId: request.user.id, entityType: SyncEntityType.EXERCISE_SETTING, entityId: request.params.id }
        })
    ]);

    reply.status(StatusCodes.OK).send({ data: { message: 'Exercise setting cleared' } });
}

export default {
    listExerciseSettings,
    upsertExerciseSetting,
    deleteExerciseSetting
};
