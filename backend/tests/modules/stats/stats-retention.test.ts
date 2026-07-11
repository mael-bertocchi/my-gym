import { clampToRetention, retentionStart } from 'src/modules/stats/stats-retention';
import { describe, expect, it } from 'vitest';

describe('retentionStart', () => {
    it('returns one year before the reference instant', () => {
        const start = retentionStart(new Date('2026-07-11T12:00:00.000Z'));

        expect(start.toISOString()).toBe('2025-07-11T12:00:00.000Z');
    });
});

describe('clampToRetention', () => {
    const now = new Date('2026-07-11T12:00:00.000Z');

    it('keeps a lower bound inside the retention window', () => {
        const from = new Date('2026-05-01T00:00:00.000Z');

        expect(clampToRetention(from, now)).toEqual(from);
    });

    it('floors a lower bound older than one year', () => {
        const from = new Date('2024-01-01T00:00:00.000Z');

        expect(clampToRetention(from, now)).toEqual(retentionStart(now));
    });

    it('falls back to the retention start when no lower bound is given', () => {
        expect(clampToRetention(undefined, now)).toEqual(retentionStart(now));
    });
});
