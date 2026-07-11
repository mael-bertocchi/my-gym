import type { PrismaClient } from 'prisma/generated/prisma/client';
import { SyncEntityType } from 'prisma/generated/prisma/client';
import { retentionStart } from 'src/modules/stats/stats-retention';

/**
 * @function purgeExpiredWorkouts
 * @description Deletes every workout started more than one year ago (entries and sets cascade) and records a sync tombstone per workout so connected devices drop them on their next pull. Exercises, gyms, and brands are untouched.
 *
 * @param {PrismaClient} prisma The Prisma client.
 * @param {Date} now The reference instant; defaults to the current time.
 * @returns {Promise<number>} The number of workouts purged.
 */
export async function purgeExpiredWorkouts(prisma: PrismaClient, now: Date = new Date()): Promise<number> {
    const expired = await prisma.workout.findMany({
        where: { startedAt: { lt: retentionStart(now) } },
        select: { id: true, userId: true }
    });

    if (expired.length === 0) {
        return 0;
    }

    await prisma.$transaction([
        prisma.workout.deleteMany({ where: { id: { in: expired.map((workout) => workout.id) } } }),
        prisma.syncDeletion.createMany({
            data: expired.map((workout) => ({
                userId: workout.userId,
                entityType: SyncEntityType.WORKOUT,
                entityId: workout.id
            }))
        })
    ]);

    return expired.length;
}
