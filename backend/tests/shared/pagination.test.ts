import { buildCursorPage, parseCursor } from 'src/shared/pagination';
import { describe, expect, it } from 'vitest';

describe('parseCursor', () => {
    it('defaults to the default limit and over-fetches by one', () => {
        const result = parseCursor({});

        expect(result.limit).toBe(25);
        expect(result.take).toBe(26);
        expect(result.cursor).toBeUndefined();
        expect(result.skip).toBeUndefined();
    });

    it('clamps the limit to MAX_LIMIT', () => {
        const result = parseCursor({ limit: 500 });

        expect(result.limit).toBe(100);
        expect(result.take).toBe(101);
    });

    it('positions on the cursor and skips it when provided', () => {
        const result = parseCursor({ cursor: 'cafef00d' });

        expect(result.cursor).toEqual({ id: 'cafef00d' });
        expect(result.skip).toBe(1);
    });
});

describe('buildCursorPage', () => {
    it('returns all rows and a null cursor when not over-fetched', () => {
        const page = buildCursorPage([{ id: 'a' }, { id: 'b' }], 25);

        expect(page.data).toHaveLength(2);
        expect(page.nextCursor).toBe(null);
    });

    it('trims the extra row and returns the last kept id as the next cursor', () => {
        const page = buildCursorPage([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 2);

        expect(page.data.map((row) => row.id)).toEqual(['a', 'b']);
        expect(page.nextCursor).toBe('b');
    });
});
