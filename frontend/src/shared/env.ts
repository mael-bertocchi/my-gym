import type { Perhaps } from '@/shared/models';

/**
 * @function readApiBaseUrl
 * @description Returns the backend base URL (no /v1) from EXPO_PUBLIC_API_URL, throwing when unset so misconfiguration fails loudly.
 *
 * @returns {string} The base URL without a trailing slash.
 */
export function readApiBaseUrl(): string {
    const raw: Perhaps<string> = process.env.EXPO_PUBLIC_API_URL;
    if (raw === undefined || raw.length === 0) {
        throw new Error('EXPO_PUBLIC_API_URL is not set');
    }
    return raw.replace(/\/+$/, '');
}
