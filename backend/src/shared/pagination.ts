import type { Maybe } from 'src/shared/models';

/**
 * @constant DEFAULT_LIMIT
 * @description Number of items a list endpoint returns when the client omits ?limit=.
 */
export const DEFAULT_LIMIT: number = 25;

/**
 * @constant MAX_LIMIT
 * @description Upper bound for ?limit=; larger requests are clamped (or rejected by the schema) to this.
 */
export const MAX_LIMIT: number = 100;

/**
 * @interface CursorQuery
 * @description Shape of the cursor-pagination query parameters shared by every list endpoint.
 */
export interface CursorQuery {
    limit?: number; /*!< Optional page size, 1..MAX_LIMIT. Defaults to DEFAULT_LIMIT. */
    cursor?: string; /*!< Optional id of the previous page's last item; results continue after it. */
}

/**
 * @interface CursorPage
 * @description Envelope returned by every cursor-paginated list endpoint.
 */
export interface CursorPage<T> {
    data: T[]; /*!< Items for the current page (length <= limit). */
    nextCursor: Maybe<string>; /*!< Cursor to fetch the next page, or null once the list is exhausted. */
}

/**
 * @interface ParsedCursor
 * @description Normalized cursor values plus the Prisma take/cursor/skip used to over-fetch by one.
 */
export interface ParsedCursor {
    limit: number; /*!< Normalized page size. */
    take: number; /*!< limit + 1, so buildCursorPage can detect whether another page exists. */
    cursor?: { id: string }; /*!< Prisma cursor positioned on the previous page's last id. */
    skip?: number; /*!< 1 when a cursor is supplied, to skip the cursor row itself. */
}

/**
 * @function parseCursor
 * @description Normalizes raw cursor-pagination query params into safe values for a Prisma query. Limit is clamped to 1..MAX_LIMIT (DEFAULT_LIMIT on non-finite values); take over-fetches by one.
 *
 * @param {CursorQuery} query The raw cursor-pagination query parameters.
 * @returns {ParsedCursor} The normalized values for the Prisma query.
 */
export function parseCursor(query: CursorQuery): ParsedCursor {
    const rawLimit: number = typeof query.limit === 'number' && Number.isFinite(query.limit) ? Math.floor(query.limit) : DEFAULT_LIMIT;
    const limit: number = rawLimit < 1 ? DEFAULT_LIMIT : (rawLimit > MAX_LIMIT ? MAX_LIMIT : rawLimit);

    const parsed: ParsedCursor = { limit, take: limit + 1 };

    if (query.cursor !== undefined && query.cursor.length !== 0) {
        parsed.cursor = { id: query.cursor };
        parsed.skip = 1;
    }

    return parsed;
}

/**
 * @function buildCursorPage
 * @description Trims an over-fetched row set to the page size and derives the next cursor. Pass the rows obtained with ParsedCursor.take (limit + 1); the presence of the extra row means another page exists and the last kept row's id becomes nextCursor.
 *
 * @param {T[]} rows The rows fetched with take = limit + 1, in their final order.
 * @param {number} limit The normalized page size from parseCursor.
 * @returns {CursorPage<T>} The page of items and the next cursor (null when exhausted).
 */
export function buildCursorPage<T extends { id: string }>(rows: T[], limit: number): CursorPage<T> {
    if (rows.length > limit) {
        const data: T[] = rows.slice(0, limit);
        return { data, nextCursor: data[data.length - 1].id };
    }

    return { data: rows, nextCursor: null };
}
