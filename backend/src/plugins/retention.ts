import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { purgeExpiredWorkouts } from 'src/modules/workouts/workouts-retention';

/**
 * @constant PURGE_INTERVAL_MS
 * @description How often the retention purge runs (24 hours).
 */
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * @function retentionPlugin
 * @description Purges workouts older than one year at startup and every 24 hours thereafter
 */
export default fp(function (fastify: FastifyInstance, _options: unknown, done: () => void): void {
    async function runPurge(): Promise<void> {
        try {
            const purged = await purgeExpiredWorkouts(fastify.prisma);

            if (purged > 0) {
                fastify.log.info({ purged }, 'Purged workouts older than one year');
            }
        } catch (err: unknown) {
            fastify.log.error(err, 'Workout retention purge failed');
        }
    }

    const timer = setInterval(() => {
        void runPurge();
    }, PURGE_INTERVAL_MS);

    fastify.addHook('onReady', runPurge);
    fastify.addHook('onClose', () => {
        clearInterval(timer);
    });

    done();
}, {
    name: 'retention',
    dependencies: ['database']
});
