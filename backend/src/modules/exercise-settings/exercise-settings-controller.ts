import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { ExerciseSettingParamsRequest, ListExerciseSettingsRequest, UpsertExerciseSettingRequest } from 'src/modules/exercise-settings/exercise-settings-models';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

/**
 * @constant EXERCISE_SETTING_SELECT
 * @description Shared field selection for remembered-setting lookups exposed by the API.
 */
const EXERCISE_SETTING_SELECT = {
    id: true,
    exerciseId: true,
    gymId: true,
    settings: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.ExerciseSettingSelect;

/**
 * @function listExerciseSettings
 * @description Lists the caller's remembered settings with optional exercise/gym filters and cursor pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listExerciseSettings(request: FastifyRequest<ListExerciseSettingsRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const where: Prisma.ExerciseSettingWhereInput = { userId: request.user.id };

    if (request.query.exerciseId !== undefined) {
        where.exerciseId = request.query.exerciseId;
    }
    if (request.query.gymId !== undefined) {
        where.gymId = request.query.gymId;
    }

    const rows = await request.server.prisma.exerciseSetting.findMany({
        where,
        select: EXERCISE_SETTING_SELECT,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take,
        cursor,
        skip
    });

    reply.status(StatusCodes.OK).send(buildCursorPage(rows, limit));
}

/**
 * @function upsertExerciseSetting
 * @description Creates or replaces the caller's remembered settings for an exercise at a gym.
 *
 * @returns {Promise<void>} Resolves when the settings are saved.
 */
async function upsertExerciseSetting(request: FastifyRequest<UpsertExerciseSettingRequest>, reply: FastifyReply): Promise<void> {
    const exercise = await request.server.prisma.exercise.findUnique({ where: { id: request.body.exerciseId } });

    if (exercise === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise not found');
    }

    const gym = await request.server.prisma.gym.findUnique({ where: { id: request.body.gymId } });

    if (gym === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Gym not found');
    }

    const settings = request.body.settings as unknown as Prisma.InputJsonValue;

    const saved = await request.server.prisma.exerciseSetting.upsert({
        where: {
            userId_exerciseId_gymId: { userId: request.user.id, exerciseId: request.body.exerciseId, gymId: request.body.gymId }
        },
        update: { settings },
        create: { userId: request.user.id, exerciseId: request.body.exerciseId, gymId: request.body.gymId, settings },
        select: EXERCISE_SETTING_SELECT
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

    await request.server.prisma.exerciseSetting.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Exercise setting cleared' } });
}

export default {
    listExerciseSettings,
    upsertExerciseSetting,
    deleteExerciseSetting
};
