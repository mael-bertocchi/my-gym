import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { Prisma } from 'prisma/generated/prisma/client';
import type { CreateWorkoutExerciseRequest, UpdateWorkoutExerciseRequest, WorkoutExerciseParamsRequest } from 'src/modules/workout-exercises/workout-exercises-models';
import { RequestError } from 'src/shared/models';

/**
 * @constant WORKOUT_EXERCISE_SELECT
 * @description Shared field selection for workout exercise lookups exposed by the API.
 */
const WORKOUT_EXERCISE_SELECT = {
    id: true,
    workoutId: true,
    exerciseId: true,
    position: true,
    notes: true,
    settings: true,
    createdAt: true
} satisfies Prisma.WorkoutExerciseSelect;

/**
 * @function createWorkoutExercise
 * @description Adds an exercise to one of the caller's workouts (position auto-assigned when omitted).
 *
 * @returns {Promise<void>} Resolves when the workout exercise is created.
 */
async function createWorkoutExercise(request: FastifyRequest<CreateWorkoutExerciseRequest>, reply: FastifyReply): Promise<void> {
    const workout = await request.server.prisma.workout.findFirst({
        where: { id: request.params.workoutId, userId: request.user.id }
    });

    if (workout === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout not found');
    }

    const exercise = await request.server.prisma.exercise.findUnique({ where: { id: request.body.exerciseId } });

    if (exercise === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise not found');
    }

    let position = request.body.position;
    if (position === undefined) {
        const last = await request.server.prisma.workoutExercise.findFirst({
            where: { workoutId: request.params.workoutId },
            orderBy: { position: 'desc' }
        });
        position = (last?.position ?? 0) + 1;
    }

    const data: Prisma.WorkoutExerciseUncheckedCreateInput = {
        workoutId: request.params.workoutId,
        exerciseId: request.body.exerciseId,
        position,
        notes: request.body.notes
    };

    if (request.body.settings !== undefined) {
        data.settings = request.body.settings as unknown as Prisma.InputJsonValue;
    }

    const created = await request.server.prisma.workoutExercise.create({
        data,
        select: WORKOUT_EXERCISE_SELECT
    });

    await request.server.prisma.workout.update({ where: { id: request.params.workoutId }, data: { updatedAt: new Date() } });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function updateWorkoutExercise
 * @description Updates a workout exercise's order, notes, or session settings. Only the provided fields change.
 *
 * @returns {Promise<void>} Resolves when the workout exercise is updated.
 */
async function updateWorkoutExercise(request: FastifyRequest<UpdateWorkoutExerciseRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.workoutExercise.findFirst({
        where: { id: request.params.workoutExerciseId, workoutId: request.params.workoutId, workout: { userId: request.user.id } }
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
    if (request.body.settings !== undefined) {
        data.settings = request.body.settings !== null ? request.body.settings as unknown as Prisma.InputJsonValue : Prisma.DbNull;
    }

    const updated = await request.server.prisma.workoutExercise.update({
        where: { id: request.params.workoutExerciseId },
        data,
        select: WORKOUT_EXERCISE_SELECT
    });

    await request.server.prisma.workout.update({ where: { id: request.params.workoutId }, data: { updatedAt: new Date() } });

    reply.status(StatusCodes.OK).send({ data: updated });
}

/**
 * @function deleteWorkoutExercise
 * @description Removes a workout exercise from one of the caller's workouts (its sets cascade away).
 *
 * @returns {Promise<void>} Resolves when the workout exercise is deleted.
 */
async function deleteWorkoutExercise(request: FastifyRequest<WorkoutExerciseParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.workoutExercise.findFirst({
        where: { id: request.params.workoutExerciseId, workoutId: request.params.workoutId, workout: { userId: request.user.id } }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Workout exercise not found');
    }

    await request.server.prisma.workoutExercise.delete({ where: { id: request.params.workoutExerciseId } });

    await request.server.prisma.workout.update({ where: { id: request.params.workoutId }, data: { updatedAt: new Date() } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Workout exercise deleted' } });
}

export default {
    createWorkoutExercise,
    updateWorkoutExercise,
    deleteWorkoutExercise
};
