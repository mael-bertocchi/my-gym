import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import { computeCalendar } from 'src/modules/stats/stats-calendar';
import { computeDashboard } from 'src/modules/stats/stats-dashboard';
import type { CalendarRequest, MuscleDistributionRequest, OverviewRequest, VolumeRequest } from 'src/modules/stats/stats-models';
import { computeMuscleBreakdown } from 'src/modules/stats/stats-muscles';
import { computeOverview } from 'src/modules/stats/stats-overview';
import { computePersonalRecords } from 'src/modules/stats/stats-records';
import { clampToRetention, retentionStart } from 'src/modules/stats/stats-retention';

/**
 * @function dateRange
 * @description Builds a startedAt range filter from from/to query params, flooring the lower bound at the one-year retention start.
 *
 * @param {Date | undefined} from The requested inclusive lower bound.
 * @param {Date | undefined} to The upper bound.
 * @returns {Prisma.DateTimeFilter} The range filter, never reaching further back than one year.
 */
function dateRange(from: Date | undefined, to: Date | undefined): Prisma.DateTimeFilter {
    return { gte: clampToRetention(from), lte: to };
}

/**
 * @function getOverview
 * @description Returns the caller's aggregate dashboard: totals, streak, frequency, and recent volume.
 *
 * @returns {Promise<void>} Resolves when the overview is sent.
 */
async function getOverview(request: FastifyRequest<OverviewRequest>, reply: FastifyReply): Promise<void> {
    const workouts = await request.server.prisma.workout.findMany({
        where: { userId: request.user.id, startedAt: dateRange(request.query.from, request.query.to) },
        select: {
            startedAt: true,
            endedAt: true,
            entries: { select: { sets: { where: { setType: 'NORMAL' }, select: { weightKg: true, reps: true } } } }
        },
        orderBy: { startedAt: 'asc' }
    });

    const raw = workouts.map((workout) => ({
        startedAt: workout.startedAt.toISOString(),
        endedAt: workout.endedAt !== null ? workout.endedAt.toISOString() : null,
        sets: workout.entries.flatMap((entry) => entry.sets.map((set) => ({
            weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
            reps: set.reps
        })))
    }));

    reply.status(StatusCodes.OK).send({ data: computeDashboard(raw, new Date()) });
}

/**
 * @function getVolume
 * @description Returns the caller's working-set volume bucketed by week or month.
 *
 * @returns {Promise<void>} Resolves when the volume series is sent.
 */
async function getVolume(request: FastifyRequest<VolumeRequest>, reply: FastifyReply): Promise<void> {
    const workouts = await request.server.prisma.workout.findMany({
        where: { userId: request.user.id, startedAt: dateRange(request.query.from, request.query.to) },
        select: {
            startedAt: true,
            endedAt: true,
            entries: { select: { sets: { where: { setType: 'NORMAL' }, select: { weightKg: true, reps: true } } } }
        },
        orderBy: { startedAt: 'asc' }
    });

    const raw = workouts.map((workout) => ({
        startedAt: workout.startedAt.toISOString(),
        endedAt: workout.endedAt !== null ? workout.endedAt.toISOString() : null,
        sets: workout.entries.flatMap((entry) => entry.sets.map((set) => ({
            weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
            reps: set.reps
        })))
    }));

    reply.status(StatusCodes.OK).send({ data: computeOverview(raw, request.query.period ?? 'week') });
}

/**
 * @function getMuscleDistribution
 * @description Returns the caller's working-set volume and set credit aggregated per muscle.
 *
 * @returns {Promise<void>} Resolves when the breakdown is sent.
 */
async function getMuscleDistribution(request: FastifyRequest<MuscleDistributionRequest>, reply: FastifyReply): Promise<void> {
    const workouts = await request.server.prisma.workout.findMany({
        where: { userId: request.user.id, startedAt: dateRange(request.query.from, request.query.to) },
        select: {
            entries: {
                select: {
                    exercise: { select: { primaryMuscle: true, secondaryMuscles: true } },
                    sets: { where: { setType: 'NORMAL' }, select: { weightKg: true, reps: true } }
                }
            }
        }
    });

    const entries = workouts.flatMap((workout) => workout.entries.map((entry) => ({
        primaryMuscle: entry.exercise.primaryMuscle,
        secondaryMuscles: entry.exercise.secondaryMuscles,
        sets: entry.sets.map((set) => ({
            weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
            reps: set.reps
        }))
    })));

    reply.status(StatusCodes.OK).send({ data: { muscles: computeMuscleBreakdown(entries) } });
}

/**
 * @function getPersonalRecords
 * @description Returns the caller's bests over the last year (heaviest set, estimated 1RM, set volume) per exercise.
 *
 * @returns {Promise<void>} Resolves when the records are sent.
 */
async function getPersonalRecords(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const workoutFilter = { userId: request.user.id, startedAt: { gte: retentionStart() } };
    const exercises = await request.server.prisma.exercise.findMany({
        where: { userId: request.user.id, workoutEntries: { some: { workout: workoutFilter } } },
        select: {
            id: true,
            name: true,
            workoutEntries: {
                where: { workout: workoutFilter },
                select: { sets: { where: { setType: 'NORMAL' }, select: { weightKg: true, reps: true } } }
            }
        }
    });

    const entries = exercises.map((exercise) => ({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: exercise.workoutEntries.flatMap((entry) => entry.sets.map((set) => ({
            weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
            reps: set.reps
        })))
    }));

    reply.status(StatusCodes.OK).send({ data: { records: computePersonalRecords(entries) } });
}

/**
 * @function getCalendar
 * @description Returns the caller's per-day workout activity for a calendar or heatmap.
 *
 * @returns {Promise<void>} Resolves when the calendar is sent.
 */
async function getCalendar(request: FastifyRequest<CalendarRequest>, reply: FastifyReply): Promise<void> {
    const workouts = await request.server.prisma.workout.findMany({
        where: { userId: request.user.id, startedAt: dateRange(request.query.from, request.query.to) },
        select: {
            startedAt: true,
            entries: { select: { sets: { where: { setType: 'NORMAL' }, select: { weightKg: true, reps: true } } } }
        },
        orderBy: { startedAt: 'asc' }
    });

    const raw = workouts.map((workout) => ({
        startedAt: workout.startedAt.toISOString(),
        sets: workout.entries.flatMap((entry) => entry.sets.map((set) => ({
            weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
            reps: set.reps
        })))
    }));

    reply.status(StatusCodes.OK).send({ data: { days: computeCalendar(raw) } });
}

export default {
    getOverview,
    getVolume,
    getMuscleDistribution,
    getPersonalRecords,
    getCalendar
};
