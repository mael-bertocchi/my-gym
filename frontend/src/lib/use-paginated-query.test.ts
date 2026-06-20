import { selectNextPage } from '@/lib/use-paginated-query';

describe('selectNextPage', () => {
    it('returns the next page when more remain', () => {
        expect(selectNextPage({ page: 1, pageSize: 25, total: 60, totalPages: 3 })).toBe(2);
    });
    it('returns undefined on the last page', () => {
        expect(selectNextPage({ page: 3, pageSize: 25, total: 60, totalPages: 3 })).toBeUndefined();
    });
    it('returns undefined when there are zero pages', () => {
        expect(selectNextPage({ page: 1, pageSize: 25, total: 0, totalPages: 0 })).toBeUndefined();
    });
});
