import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import type { CreateWorkoutExerciseRequest, UpdateWorkoutExerciseRequest, WorkoutExerciseParamsRequest } from 'src/modules/workout-exercises/workout-exercises-models';
import { RequestError } from 'src/shared/models';

/**
 * @constant WORKOUT_EXERCISE_SELECT
 * @description Shared field selection for workout exercise lookups exposed by the API.
 */
const WORKOUT_EXERCISE_SELECT = {
    id: true,
    workoutId: true,
    exerciseVariantId: true,
    position: true,
    notes: true,
    createdAt: true
} satisfies Prisma.WorkoutExerciseSelect;

/**
 * @function createWorkoutExercise
 * @description Adds an exercise variant to one of the user's workouts (position auto-assigned when omitted).
 *
 * @returns {Promise<void>} Resolves when the workout exercise is created.
 */
async function createWorkoutExercise(request: FastifyRequest<CreateWorkoutExerciseRequest>, reply: FastifyReply): Promise<void> {
    const workout = await request.server.prisma.workout.findFirst({
        where: { id: request.body.workoutId, userId: request.user.id }
    });

    if (workout === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout not found');
    }

    const variant = await request.server.prisma.exerciseVariant.findFirst({
        where: { id: request.body.exerciseVariantId, exercise: { userId: request.user.id } }
    });

    if (variant === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise variant not found');
    }

    let position = request.body.position;
    if (position === undefined) {
        const last = await request.server.prisma.workoutExercise.findFirst({
            where: { workoutId: request.body.workoutId },
            orderBy: { position: 'desc' }
        });
        position = (last?.position ?? 0) + 1;
    }

    const created = await request.server.prisma.workoutExercise.create({
        data: {
            workoutId: request.body.workoutId,
            exerciseVariantId: request.body.exerciseVariantId,
            position,
            notes: request.body.notes
        },
        select: WORKOUT_EXERCISE_SELECT
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateWorkoutExercise
 * @description Updates a workout exercise owned by the user. Only the provided fields change.
 *
 * @returns {Promise<void>} Resolves when the workout exercise is updated.
 */
async function updateWorkoutExercise(request: FastifyRequest<UpdateWorkoutExerciseRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.workoutExercise.findFirst({
        where: { id: request.params.id, workout: { userId: request.user.id } }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout exercise not found');
    }

    const data: Prisma.WorkoutExerciseUncheckedUpdateInput = {};

    if (request.body.position !== undefined) {
        data.position = request.body.position;
    }
    if (request.body.notes !== undefined) {
        data.notes = request.body.notes;
    }

    const updated = await request.server.prisma.workoutExercise.update({
        where: { id: request.params.id },
        data,
        select: WORKOUT_EXERCISE_SELECT
    });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteWorkoutExercise
 * @description Removes a workout exercise owned by the user (its sets cascade away).
 *
 * @returns {Promise<void>} Resolves when the workout exercise is deleted.
 */
async function deleteWorkoutExercise(request: FastifyRequest<WorkoutExerciseParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.workoutExercise.findFirst({
        where: { id: request.params.id, workout: { userId: request.user.id } }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout exercise not found');
    }

    await request.server.prisma.workoutExercise.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Workout exercise deleted' } });
}

export default {
    createWorkoutExercise,
    updateWorkoutExercise,
    deleteWorkoutExercise
};
