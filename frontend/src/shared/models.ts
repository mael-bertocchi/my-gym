/**
 * @type Maybe
 * @description A value that may be absent as null.
 */
export type Maybe<T> = T | null;

/**
 * @type Perhaps
 * @description A value that may be absent as undefined.
 */
export type Perhaps<T> = T | undefined;

/**
 * @interface ApiError
 * @description Normalized client-side error for a non-2xx backend response. The HTTP status is carried here because the backend error body is only { message, data }.
 */
export interface ApiError {
    status: number; /*!< HTTP status code (401, 404, 409, 5xx, …) */
    message: string; /*!< Human-readable message from the backend envelope */
    data: unknown; /*!< Optional structured error payload */
}

/**
 * @function isApiError
 * @description Type guard recognizing a normalized ApiError without using a type assertion.
 *
 * @param {unknown} value The candidate value.
 * @returns {value is ApiError} True when the value matches the ApiError shape.
 */
export function isApiError(value: unknown): value is ApiError {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate: Record<string, unknown> = { ...value };
    return typeof candidate.status === 'number' && typeof candidate.message === 'string';
}
