import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { AiContentStatus, EquipmentType, type Prisma } from 'prisma/generated/prisma/client';
import type { CreateExerciseVariantRequest, ExerciseVariantParamsRequest, ListExerciseVariantsRequest } from 'src/modules/exercise-variants/exercise-variants-models';
import { generateVariantContent } from 'src/modules/exercise-variants/exercise-variants-onboarding';
import { RequestError } from 'src/shared/models';
import { buildPaginationMeta, parsePagination, type PaginatedResponse } from 'src/shared/pagination';

/**
 * @constant EXERCISE_VARIANT_SELECT
 * @description Shared field selection for variant lookups exposed by the API.
 */
const EXERCISE_VARIANT_SELECT = {
    id: true,
    exerciseId: true,
    equipmentType: true,
    machineBrandId: true,
    formSummary: true,
    instructions: true,
    equipmentTips: true,
    previewImageUrl: true,
    aiContentStatus: true,
    aiGeneratedAt: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.ExerciseVariantSelect;

/**
 * @function runOnboarding
 * @description Generates and persists coaching content for a variant, flipping aiContentStatus. Never throws; failures land as FAILED.
 *
 * @param {FastifyRequest} request The request, used to reach prisma, the AI client, and the logger.
 * @param {string} variantId The identifier of the variant to onboard.
 * @returns {Promise<void>} Resolves once the variant has been updated.
 */
async function runOnboarding(request: FastifyRequest, variantId: string): Promise<void> {
    const variant = await request.server.prisma.exerciseVariant.findUnique({
        where: { id: variantId },
        include: { exercise: true, machineBrand: true }
    });

    if (variant === null) {
        return;
    }

    try {
        const content = await generateVariantContent(request.server.ai, {
            exerciseName: variant.exercise.name,
            primaryMuscle: variant.exercise.primaryMuscle,
            secondaryMuscles: variant.exercise.secondaryMuscles,
            equipmentType: variant.equipmentType,
            brandName: variant.machineBrand?.name
        });

        await request.server.prisma.exerciseVariant.update({
            where: { id: variantId },
            data: {
                formSummary: content.formSummary,
                instructions: content.instructions,
                equipmentTips: content.equipmentTips,
                aiContentStatus: AiContentStatus.GENERATED,
                aiGeneratedAt: new Date()
            }
        });
    } catch (err: unknown) {
        request.log.error({ err, variantId }, 'Variant onboarding failed');
        try {
            await request.server.prisma.exerciseVariant.update({
                where: { id: variantId },
                data: { aiContentStatus: AiContentStatus.FAILED }
            });
        } catch (updateErr: unknown) {
            request.log.error({ err: updateErr, variantId }, 'Failed to mark variant as FAILED');
        }
    }
}

/**
 * @function listExerciseVariants
 * @description Lists the user's variants, optionally filtered to one exercise, with pagination.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listExerciseVariants(request: FastifyRequest<ListExerciseVariantsRequest>, reply: FastifyReply): Promise<void> {
    const { page, pageSize, skip, take } = parsePagination(request.query);

    const where: Prisma.ExerciseVariantWhereInput = { exercise: { userId: request.user.id } };

    if (request.query.exerciseId !== undefined) {
        where.exerciseId = request.query.exerciseId;
    }

    const [total, rows] = await Promise.all([
        request.server.prisma.exerciseVariant.count({ where }),
        request.server.prisma.exerciseVariant.findMany({ where, select: EXERCISE_VARIANT_SELECT, orderBy: { createdAt: 'desc' }, skip, take })
    ]);

    const pagination = buildPaginationMeta(total, pageSize, page);

    let data = rows;
    if (total !== 0 && pagination.page !== page) {
        data = await request.server.prisma.exerciseVariant.findMany({
            where,
            select: EXERCISE_VARIANT_SELECT,
            orderBy: { createdAt: 'desc' },
            skip: (pagination.page - 1) * pageSize,
            take
        });
    }

    const body: PaginatedResponse<typeof data[number]> = { data, pagination };

    reply.status(StatusCodes.OK).send(body);
}

/**
 * @function getExerciseVariant
 * @description Retrieves a single variant owned by the user.
 *
 * @returns {Promise<void>} Resolves when the variant is sent.
 */
async function getExerciseVariant(request: FastifyRequest<ExerciseVariantParamsRequest>, reply: FastifyReply): Promise<void> {
    const variant = await request.server.prisma.exerciseVariant.findFirst({
        where: { id: request.params.id, exercise: { userId: request.user.id } },
        select: EXERCISE_VARIANT_SELECT
    });

    if (variant === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise variant not found');
    }

    reply.status(StatusCodes.OK).send({ data: variant });
}

/**
 * @function createExerciseVariant
 * @description Creates a variant (movement + equipment + optional brand), then generates its coaching content.
 *
 * @returns {Promise<void>} Resolves when the variant is created.
 */
async function createExerciseVariant(request: FastifyRequest<CreateExerciseVariantRequest>, reply: FastifyReply): Promise<void> {
    const exercise = await request.server.prisma.exercise.findFirst({
        where: { id: request.body.exerciseId, userId: request.user.id }
    });

    if (exercise === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise not found');
    }

    if (request.body.equipmentType === EquipmentType.MACHINE && request.body.machineBrandId === undefined) {
        throw new RequestError(StatusCodes.BAD_REQUEST, 'A machine brand is required for machine variants');
    }

    if (request.body.machineBrandId !== undefined) {
        const brand = await request.server.prisma.machineBrand.findFirst({
            where: { id: request.body.machineBrandId, userId: request.user.id }
        });

        if (brand === null) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Machine brand not found');
        }
    }

    const duplicate = await request.server.prisma.exerciseVariant.findFirst({
        where: {
            exerciseId: request.body.exerciseId,
            equipmentType: request.body.equipmentType,
            machineBrandId: request.body.machineBrandId ?? null
        }
    });

    if (duplicate !== null) {
        throw new RequestError(StatusCodes.CONFLICT, 'This exercise variant already exists');
    }

    const created = await request.server.prisma.exerciseVariant.create({
        data: {
            exerciseId: request.body.exerciseId,
            equipmentType: request.body.equipmentType,
            machineBrandId: request.body.machineBrandId ?? null
        }
    });

    await runOnboarding(request, created.id);

    const variant = await request.server.prisma.exerciseVariant.findUnique({
        where: { id: created.id },
        select: EXERCISE_VARIANT_SELECT
    });

    if (variant === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise variant not found');
    }

    reply.status(StatusCodes.CREATED).send({ data: variant });
}

/**
 * @function regenerateExerciseVariant
 * @description Re-runs onboarding for a variant (e.g. after a FAILED attempt).
 *
 * @returns {Promise<void>} Resolves when the variant has been regenerated.
 */
async function regenerateExerciseVariant(request: FastifyRequest<ExerciseVariantParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exerciseVariant.findFirst({
        where: { id: request.params.id, exercise: { userId: request.user.id } }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise variant not found');
    }

    await runOnboarding(request, request.params.id);

    const variant = await request.server.prisma.exerciseVariant.findUnique({
        where: { id: request.params.id },
        select: EXERCISE_VARIANT_SELECT
    });

    if (variant === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise variant not found');
    }

    reply.status(StatusCodes.OK).send({ data: variant });
}

/**
 * @function deleteExerciseVariant
 * @description Removes a variant owned by the user.
 *
 * @returns {Promise<void>} Resolves when the variant is deleted.
 */
async function deleteExerciseVariant(request: FastifyRequest<ExerciseVariantParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.exerciseVariant.findFirst({
        where: { id: request.params.id, exercise: { userId: request.user.id } }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise variant not found');
    }

    await request.server.prisma.exerciseVariant.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Exercise variant deleted' } });
}

export default {
    listExerciseVariants,
    getExerciseVariant,
    createExerciseVariant,
    regenerateExerciseVariant,
    deleteExerciseVariant
};
