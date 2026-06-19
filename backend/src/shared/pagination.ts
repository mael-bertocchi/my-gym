/**
 * @constant PAGE_SIZES
 * @description Allowed page sizes. Enforced by the JSON Schema fragment.
 */
export const PAGE_SIZES: readonly number[] = [10, 25, 50, 100];

/**
 * @constant DEFAULT_PAGE_SIZE
 * @description Default page size when the client omits the parameter.
 */
export const DEFAULT_PAGE_SIZE: number = 25;

/**
 * @interface PaginationQuery
 * @description Shape of the pagination-related query parameters.
 */
export interface PaginationQuery {
    page?: number; /*!< Optional page number, 1-based. Defaults to 1 when not a finite number. Clamped to >= 1. */
    pageSize?: number; /*!< Optional page size. Must be one of PAGE_SIZES when provided, otherwise defaults to DEFAULT_PAGE_SIZE. */
    search?: string; /*!< Optional search string for filtering results. Max length 200 characters. */
}

/**
 * @interface PaginationMeta
 * @description Metadata returned with each paginated response.
 */
export interface PaginationMeta {
    page: number; /*!< Current page number, 1-based. Clamped to totalPages when requested page exceeds totalPages. Defaults to 1 when total is 0. */
    pageSize: number; /*!< Number of items per page. One of PAGE_SIZES. */
    total: number; /*!< Total number of items across all pages. */
    totalPages: number; /*!< Total number of pages, calculated as Math.ceil(total / pageSize). Can be 0 when total is 0. */
}

/**
 * @interface PaginatedResponse
 * @description Envelope returned by every paginated list endpoint.
 */
export interface PaginatedResponse<T> {
    data: T[]; /*!< Array of items for the current page. Length can be less than pageSize on the last page. */
    pagination: PaginationMeta; /*!< Pagination metadata for the current response. */
}

/**
 * @interface ParsedPagination
 * @description Result of parsePagination: normalized values plus Prisma skip/take.
 */
export interface ParsedPagination {
    page: number; /*!< Current page number, 1-based. */
    pageSize: number; /*!< Number of items per page. */
    skip: number; /*!< Number of items to skip for the Prisma query. */
    take: number; /*!< Number of items to take for the Prisma query. */
}

/**
 * @function parsePagination
 * @description Normalizes raw pagination query params into safe values for a Prisma query. Page is clamped to >= 1 (defaults to 1 on non-finite values). PageSize falls back to DEFAULT_PAGE_SIZE when not in PAGE_SIZES.
 *
 * @param {PaginationQuery} query The raw pagination query parameters.
 * @returns {ParsedPagination} The normalized pagination values for the Prisma query.
 */
export function parsePagination(query: PaginationQuery): ParsedPagination {
    const rawPage: number = typeof query.page === 'number' && Number.isFinite(query.page) ? query.page : 1;
    const page: number = rawPage > 0 ? Math.floor(rawPage) : 1;

    const rawSize: number = typeof query.pageSize !== 'number' ? DEFAULT_PAGE_SIZE : query.pageSize;
    const pageSize: number = PAGE_SIZES.includes(rawSize) ? rawSize : DEFAULT_PAGE_SIZE;

    return {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize
    };
}

/**
 * @function buildPaginationMeta
 * @description Builds the pagination meta object given total rows. When the requested page overshoots totalPages, the returned page is clamped to the last page (totalPages), or 1 when total is 0. Callers should re-query with skip = (page - 1) * pageSize if page was clamped.
 *
 * @param {number} total The total number of items across all pages.
 * @param {number} pageSize The number of items per page.
 * @param {number} requestedPage The requested page number.
 * @returns {PaginationMeta} The pagination metadata for the current response.
 */
export function buildPaginationMeta(total: number, pageSize: number, requestedPage: number): PaginationMeta {
    const totalPages: number = total !== 0 ? Math.ceil(total / pageSize) : 0;
    const page: number = total !== 0 ? (requestedPage > totalPages ? totalPages : requestedPage) : 1;

    return { page, pageSize, total, totalPages };
}
