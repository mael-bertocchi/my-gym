import { round } from 'src/shared/math';
import type { Maybe } from 'src/shared/models';

/**
 * @interface RawSet
 * @description A working set's load and reps (weights already converted from Decimal).
 */
export interface RawSet {
    weightKg: Maybe<number>; /*!< External load in kg, or null for bodyweight */
    reps: Maybe<number>; /*!< Reps performed */
}

/**
 * @interface RawSession
 * @description One session's working sets for a variant.
 */
export interface RawSession {
    date: string; /*!< ISO timestamp of when the session started */
    sets: RawSet[]; /*!< The working sets logged for the variant in that session */
}

/**
 * @interface SessionStats
 * @description Computed progression numbers for a single session.
 */
export interface SessionStats {
    date: string; /*!< ISO timestamp of the session */
    setCount: number; /*!< Number of working sets */
    totalReps: number; /*!< Sum of reps across the sets */
    totalVolume: number; /*!< Sum of weight x reps (bodyweight contributes 0) */
    maxWeightKg: Maybe<number>; /*!< Heaviest load, or null if all bodyweight */
    bestEstimated1RM: Maybe<number>; /*!< Best Epley estimated 1RM, or null if no weighted reps */
}

/**
 * @interface RepPR
 * @description The heaviest external load lifted for a given rep count across all of a variant's sessions.
 */
export interface RepPR {
    reps: number; /*!< Rep count */
    weightKg: number; /*!< Heaviest load lifted for that rep count */
    estimated1RM: number; /*!< Epley estimated 1RM for that load and rep count */
}

/**
 * @interface VariantStatsSummary
 * @description Bests across all sessions.
 */
export interface VariantStatsSummary {
    sessionCount: number; /*!< Number of sessions */
    maxWeightKg: Maybe<number>; /*!< Heaviest load across sessions */
    bestEstimated1RM: Maybe<number>; /*!< Best estimated 1RM across sessions */
    bestTotalVolume: Maybe<number>; /*!< Highest session volume */
    repPRs: RepPR[]; /*!< Heaviest load per rep count, ascending by reps */
}

/**
 * @interface VariantStats
 * @description Per-session progression plus an overall summary.
 */
export interface VariantStats {
    sessions: SessionStats[]; /*!< Per-session stats, in input order */
    summary: VariantStatsSummary; /*!< Bests across all sessions */
}

/**
 * @function computeRepPRs
 * @description Finds the heaviest weighted load lifted for each rep count across all sessions.
 *
 * @param {RawSession[]} sessions The variant's sessions.
 * @returns {RepPR[]} One entry per rep count, ascending by reps.
 */
function computeRepPRs(sessions: RawSession[]): RepPR[] {
    const heaviestByReps = new Map<number, number>();

    for (const session of sessions) {
        for (const set of session.sets) {
            if (set.weightKg === null || set.reps === null) {
                continue;
            }
            const current = heaviestByReps.get(set.reps);
            if (current === undefined || set.weightKg > current) {
                heaviestByReps.set(set.reps, set.weightKg);
            }
        }
    }

    return [...heaviestByReps.entries()]
        .map(([reps, weightKg]) => ({ reps, weightKg, estimated1RM: round(weightKg * (1 + reps / 30)) }))
        .sort((left, right) => left.reps - right.reps);
}

/**
 * @function computeSessionStats
 * @description Computes the progression numbers for one session.
 *
 * @param {RawSession} session The session to summarise.
 * @returns {SessionStats} The computed per-session stats.
 */
function computeSessionStats(session: RawSession): SessionStats {
    let totalReps = 0;
    let totalVolume = 0;
    let maxWeightKg: Maybe<number> = null;
    let bestEstimated1RM: Maybe<number> = null;

    for (const set of session.sets) {
        const reps = set.reps ?? 0;
        const weight = set.weightKg ?? 0;
        totalReps += reps;
        totalVolume += weight * reps;

        if (set.weightKg !== null && (maxWeightKg === null || set.weightKg > maxWeightKg)) {
            maxWeightKg = set.weightKg;
        }
        if (set.weightKg !== null && set.reps !== null) {
            const estimate = set.weightKg * (1 + set.reps / 30);
            if (bestEstimated1RM === null || estimate > bestEstimated1RM) {
                bestEstimated1RM = estimate;
            }
        }
    }

    return {
        date: session.date,
        setCount: session.sets.length,
        totalReps,
        totalVolume: round(totalVolume),
        maxWeightKg,
        bestEstimated1RM: bestEstimated1RM !== null ? round(bestEstimated1RM) : null
    };
}

/**
 * @function computeVariantStats
 * @description Computes per-session stats and an overall summary for a variant's session history.
 *
 * @param {RawSession[]} sessions The variant's sessions (each with its working sets).
 * @returns {VariantStats} The per-session stats and summary.
 */
export function computeVariantStats(sessions: RawSession[]): VariantStats {
    const sessionStats = sessions.map(computeSessionStats);

    let maxWeightKg: Maybe<number> = null;
    let bestEstimated1RM: Maybe<number> = null;
    let bestTotalVolume: Maybe<number> = null;

    for (const session of sessionStats) {
        if (session.maxWeightKg !== null && (maxWeightKg === null || session.maxWeightKg > maxWeightKg)) {
            maxWeightKg = session.maxWeightKg;
        }
        if (session.bestEstimated1RM !== null && (bestEstimated1RM === null || session.bestEstimated1RM > bestEstimated1RM)) {
            bestEstimated1RM = session.bestEstimated1RM;
        }
        if (bestTotalVolume === null || session.totalVolume > bestTotalVolume) {
            bestTotalVolume = session.totalVolume;
        }
    }

    return {
        sessions: sessionStats,
        summary: {
            sessionCount: sessionStats.length,
            maxWeightKg,
            bestEstimated1RM,
            bestTotalVolume,
            repPRs: computeRepPRs(sessions)
        }
    };
}
