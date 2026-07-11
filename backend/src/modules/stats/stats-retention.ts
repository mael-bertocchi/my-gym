/**
 * @function retentionStart
 * @description Returns the earliest instant statistics may read from: one year before now.
 *
 * @param {Date} now The reference instant; defaults to the current time.
 * @returns {Date} The inclusive lower bound for statistics data.
 */
export function retentionStart(now: Date = new Date()): Date {
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    return start;
}

/**
 * @function clampToRetention
 * @description Floors an optional lower bound at the retention start so statistics never read data older than one year.
 *
 * @param {Date | undefined} from The requested inclusive lower bound.
 * @param {Date} now The reference instant; defaults to the current time.
 * @returns {Date} The effective lower bound, never older than the retention start.
 */
export function clampToRetention(from: Date | undefined, now: Date = new Date()): Date {
    const floor = retentionStart(now);
    return from !== undefined && from > floor ? from : floor;
}
