import { buildPaginationMeta, parsePagination } from 'src/shared/pagination';
import { describe, expect, it } from 'vitest';

describe('parsePagination', () => {
    it('defaults to page 1 and the default page size', () => {
        const result = parsePagination({});

        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(25);
        expect(result.skip).toBe(0);
        expect(result.take).toBe(25);
    });

    it('computes skip from page and page size', () => {
        const result = parsePagination({ page: 3, pageSize: 10 });

        expect(result.skip).toBe(20);
        expect(result.take).toBe(10);
    });

    it('falls back to the default page size for sizes outside PAGE_SIZES', () => {
        const result = parsePagination({ pageSize: 7 });

        expect(result.pageSize).toBe(25);
    });
});

describe('buildPaginationMeta', () => {
    it('clamps an overshooting page to the last page', () => {
        const meta = buildPaginationMeta(45, 10, 99);

        expect(meta.totalPages).toBe(5);
        expect(meta.page).toBe(5);
    });

    it('reports page 1 and zero pages when there are no rows', () => {
        const meta = buildPaginationMeta(0, 10, 1);

        expect(meta.total).toBe(0);
        expect(meta.totalPages).toBe(0);
        expect(meta.page).toBe(1);
    });
});
