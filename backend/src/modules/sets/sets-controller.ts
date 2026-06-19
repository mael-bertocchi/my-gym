import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateSetRequest, SetParamsRequest, UpdateSetRequest } from 'src/modules/sets/sets-models';
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
    restSeconds: true,
    durationSeconds: true,
    tempo: true,
    notes: true,
    isCompleted: true,
    createdAt: true
} satisfies Prisma.SetEntrySelect;

/**
 * @function createSet
 * @description Logs a set under one of the user's workout exercises (setNumber auto-assigned when omitted).
 *
 * @returns {Promise<void>} Resolves when the set is created.
 */
async function createSet(request: FastifyRequest<CreateSetRequest>, reply: FastifyReply): Promise<void> {
    const parent = await request.server.prisma.workoutExercise.findFirst({
        where: { id: request.body.workoutExerciseId, workout: { userId: request.user.id } }
    });

    if (parent === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout exercise not found');
    }

    let setNumber = request.body.setNumber;
    if (setNumber === undefined) {
        const last = await request.server.prisma.setEntry.findFirst({
            where: { workoutExerciseId: request.body.workoutExerciseId },
            orderBy: { setNumber: 'desc' }
        });
        setNumber = (last?.setNumber ?? 0) + 1;
    }

    const created = await request.server.prisma.setEntry.create({
        data: {
            workoutExerciseId: request.body.workoutExerciseId,
            setNumber,
            setType: request.body.setType,
            weightKg: request.body.weightKg,
            reps: request.body.reps,
            rpe: request.body.rpe,
            restSeconds: request.body.restSeconds,
            durationSeconds: request.body.durationSeconds,
            tempo: request.body.tempo,
            notes: request.body.notes,
            isCompleted: request.body.isCompleted
        },
        select: SET_SELECT
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateSet
 * @description Updates a set owned by the user. Only the provided fields change.
 *
 * @returns {Promise<void>} Resolves when the set is updated.
 */
async function updateSet(request: FastifyRequest<UpdateSetRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.setEntry.findFirst({
        where: { id: request.params.id, workoutExercise: { workout: { userId: request.user.id } } }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Set not found');
    }

    const data: Prisma.SetEntryUncheckedUpdateInput = {};

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
    if (request.body.restSeconds !== undefined) {
        data.restSeconds = request.body.restSeconds;
    }
    if (request.body.durationSeconds !== undefined) {
        data.durationSeconds = request.body.durationSeconds;
    }
    if (request.body.tempo !== undefined) {
        data.tempo = request.body.tempo;
    }
    if (request.body.notes !== undefined) {
        data.notes = request.body.notes;
    }
    if (request.body.isCompleted !== undefined) {
        data.isCompleted = request.body.isCompleted;
    }

    const updated = await request.server.prisma.setEntry.update({
        where: { id: request.params.id },
        data,
        select: SET_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteSet
 * @description Removes a set owned by the user.
 *
 * @returns {Promise<void>} Resolves when the set is deleted.
 */
async function deleteSet(request: FastifyRequest<SetParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.setEntry.findFirst({
        where: { id: request.params.id, workoutExercise: { workout: { userId: request.user.id } } }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Set not found');
    }

    await request.server.prisma.setEntry.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Set deleted' } });
}

export default {
    createSet,
    updateSet,
    deleteSet
};
