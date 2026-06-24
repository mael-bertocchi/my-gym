import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateSetRequest, SetParamsRequest, UpdateSetRequest } from 'src/modules/sets/sets-models';
import { detectPersonalRecords } from 'src/modules/sets/sets-records';
import { RequestError } from 'src/shared/models';

/**
 * @constant SET_SELECT
 * @description Shared field selection for set lookups exposed by the API.
 */
const SET_SELECT = {
    id: true,
    workoutExerciseId: true,
    setNumber: true,
    setType: true,
    weightKg: true,
    reps: true,
    rpe: true,
    distanceM: true,
    durationSeconds: true,
    isCompleted: true,
    createdAt: true
} satisfies Prisma.WorkoutSetSelect;

/**
 * @function createSet
 * @description Logs a set under one of the caller's workout exercises (setNumber auto-assigned when omitted) and reports any personal records it sets.
 *
 * @returns {Promise<void>} Resolves when the set is created.
 */
async function createSet(request: FastifyRequest<CreateSetRequest>, reply: FastifyReply): Promise<void> {
    const parent = await request.server.prisma.workoutExercise.findFirst({
        where: { id: request.params.workoutExerciseId, workoutId: request.params.workoutId, workout: { userId: request.user.id } },
        select: { id: true, exerciseId: true }
    });

    if (parent === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout exercise not found');
    }

    let setNumber = request.body.setNumber;
    if (setNumber === undefined) {
        const last = await request.server.prisma.workoutSet.findFirst({
            where: { workoutExerciseId: request.params.workoutExerciseId },
            orderBy: { setNumber: 'desc' }
        });
        setNumber = (last?.setNumber ?? 0) + 1;
    }

    const created = await request.server.prisma.workoutSet.create({
        data: {
            workoutExerciseId: request.params.workoutExerciseId,
            setNumber,
            setType: request.body.setType,
            weightKg: request.body.weightKg,
            reps: request.body.reps,
            rpe: request.body.rpe,
            distanceM: request.body.distanceM,
            durationSeconds: request.body.durationSeconds,
            isCompleted: request.body.isCompleted
        },
        select: SET_SELECT
    });

    const personalRecords = await detectPersonalRecords(request.server.prisma, request.user.id, parent.exerciseId, created.id);

    reply.status(StatusCodes.CREATED).send({ data: { set: created, personalRecords } });
}

/**
 * @function updateSet
 * @description Updates one of the caller's sets and re-checks for personal records. Only the provided fields change.
 *
 * @returns {Promise<void>} Resolves when the set is updated.
 */
async function updateSet(request: FastifyRequest<UpdateSetRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.workoutSet.findFirst({
        where: {
            id: request.params.setId,
            workoutExercise: { id: request.params.workoutExerciseId, workoutId: request.params.workoutId, workout: { userId: request.user.id } }
        },
        select: { id: true, workoutExercise: { select: { exerciseId: true } } }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Set not found');
    }

    const data: Prisma.WorkoutSetUncheckedUpdateInput = {};

    if (request.body.setNumber !== undefined) {
        data.setNumber = request.body.setNumber;
    }
    if (request.body.setType !== undefined) {
        data.setType = request.body.setType;
    }
    if (request.body.weightKg !== undefined) {
        data.weightKg = request.body.weightKg;
    }
    if (request.body.reps !== undefined) {
        data.reps = request.body.reps;
    }
    if (request.body.rpe !== undefined) {
        data.rpe = request.body.rpe;
    }
    if (request.body.distanceM !== undefined) {
        data.distanceM = request.body.distanceM;
    }
    if (request.body.durationSeconds !== undefined) {
        data.durationSeconds = request.body.durationSeconds;
    }
    if (request.body.isCompleted !== undefined) {
        data.isCompleted = request.body.isCompleted;
    }

    const updated = await request.server.prisma.workoutSet.update({
        where: { id: request.params.setId },
        data,
        select: SET_SELECT
    });

    const personalRecords = await detectPersonalRecords(request.server.prisma, request.user.id, existing.workoutExercise.exerciseId, updated.id);

    reply.status(StatusCodes.OK).send({ data: { set: updated, personalRecords } });
}

/**
 * @function deleteSet
 * @description Removes one of the caller's sets.
 *
 * @returns {Promise<void>} Resolves when the set is deleted.
 */
async function deleteSet(request: FastifyRequest<SetParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.workoutSet.findFirst({
        where: {
            id: request.params.setId,
            workoutExercise: { id: request.params.workoutExerciseId, workoutId: request.params.workoutId, workout: { userId: request.user.id } }
        }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Set not found');
    }

    await request.server.prisma.workoutSet.delete({ where: { id: request.params.setId } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Set deleted' } });
}

export default {
    createSet,
    updateSet,
    deleteSet
};
