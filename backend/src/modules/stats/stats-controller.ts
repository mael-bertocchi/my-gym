import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { Prisma } from 'prisma/generated/prisma/client';
import { computeVariantStats } from 'src/modules/stats/stats-compute';
import type { VariantStatsRequest } from 'src/modules/stats/stats-models';
import { RequestError } from 'src/shared/models';

/**
 * @function getVariantStats
 * @description Returns per-session progression stats for one of the user's exercise variants.
 *
 * @returns {Promise<void>} Resolves when the stats are sent.
 */
async function getVariantStats(request: FastifyRequest<VariantStatsRequest>, reply: FastifyReply): Promise<void> {
    const variant = await request.server.prisma.exerciseVariant.findFirst({
        where: { id: request.params.id, exercise: { userId: request.user.id } }
    });

    if (variant === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Exercise variant not found');
    }

    const where: Prisma.WorkoutWhereInput = {
        userId: request.user.id,
        entries: { some: { exerciseVariantId: request.params.id } }
    };

    if (request.query.gymLocationId !== undefined) {
        where.gymLocationId = request.query.gymLocationId;
    }
    if (request.query.from !== undefined || request.query.to !== undefined) {
        where.startedAt = { gte: request.query.from, lte: request.query.to };
    }

    const workouts = await request.server.prisma.workout.findMany({
        where,
        select: {
            startedAt: true,
            entries: {
                where: { exerciseVariantId: request.params.id },
                select: {
                    sets: {
                        where: { setType: 'WORKING' },
                        select: { weightKg: true, reps: true }
                    }
                }
            }
        },
        orderBy: { startedAt: 'asc' }
    });

    const sessions = workouts.map((workout) => ({
        date: workout.startedAt.toISOString(),
        sets: workout.entries.flatMap((entry) => entry.sets.map((set) => ({
            weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
            reps: set.reps
        })))
    }));

    const stats = computeVariantStats(sessions);

    reply.status(StatusCodes.OK).send({ data: { variantId: request.params.id, ...stats } });
}

export default {
    getVariantStats
};
