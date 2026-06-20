import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { Perhaps } from '@/shared/models';

/**
 * @interface PaginationMeta
 * @description The pagination block returned by every list endpoint (mirrors the backend).
 */
export interface PaginationMeta {
    page: number; /*!< Current 1-based page */
    pageSize: number; /*!< Items per page */
    total: number; /*!< Total items across all pages */
    totalPages: number; /*!< Total page count */
}

/**
 * @interface PaginatedResponse
 * @description The full paginated envelope for a list endpoint.
 */
export interface PaginatedResponse<T> {
    data: T[]; /*!< Items for the current page */
    pagination: PaginationMeta; /*!< The returned pagination meta */
}

/**
 * @function selectNextPage
 * @description Resolves the next page number from the server's RETURNED pagination meta, or undefined when none remain.
 *
 * @param {PaginationMeta} meta The pagination meta from the latest page.
 * @returns {Perhaps<number>} The next page number, or undefined.
 */
export function selectNextPage(meta: PaginationMeta): Perhaps<number> {
    if (meta.page >= meta.totalPages) {
        return undefined;
    }
    return meta.page + 1;
}

/**
 * @function usePaginatedQuery
 * @description Infinite-query wrapper keyed off the server's returned page meta (v5 initialPageParam + getNextPageParam).
 *
 * @param {(string | number)[]} key The query key.
 * @param {(page: number) => Promise<PaginatedResponse<T>>} fetchPage Fetches one page.
 * @returns {UseInfiniteQueryResult<InfiniteData<PaginatedResponse<T>, number>, Error>} The infinite-query result.
 */
export function usePaginatedQuery<T>(key: (string | number)[], fetchPage: (page: number) => Promise<PaginatedResponse<T>>): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<T>, number>, Error> {
    return useInfiniteQuery({
        queryKey: key,
        queryFn: ({ pageParam }) => fetchPage(pageParam),
        initialPageParam: 1,
        getNextPageParam: (last: PaginatedResponse<T>) => selectNextPage(last.pagination)
    });
}
