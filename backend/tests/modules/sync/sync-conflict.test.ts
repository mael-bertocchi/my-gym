import { resolveConflict } from 'src/modules/sync/sync-conflict';
import { describe, expect, it } from 'vitest';

describe('resolveConflict', () => {
    it('applies when the client change is newer than the server', () => {
        expect(resolveConflict(new Date('2026-06-15T10:00:00.000Z'), new Date('2026-06-15T11:00:00.000Z'))).toBe('apply');
    });

    it('keeps the server version when the client change is older', () => {
        expect(resolveConflict(new Date('2026-06-15T11:00:00.000Z'), new Date('2026-06-15T10:00:00.000Z'))).toBe('keep');
    });

    it('applies on a tie so an idempotent re-push still lands', () => {
        const instant = new Date('2026-06-15T10:00:00.000Z');
        expect(resolveConflict(instant, new Date(instant.getTime()))).toBe('apply');
    });
});
