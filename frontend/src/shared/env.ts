import type { Perhaps } from '@/shared/models';
import { Platform } from 'react-native';

/**
 * @function readApiBaseUrl
 * @description Returns the backend base URL (no /v1) from EXPO_PUBLIC_API_URL, throwing when unset so misconfiguration fails loudly. On the Android emulator, a localhost host is rewritten to 10.0.2.2 (the emulator's alias for the host machine), so a portable .env keeps working without a device-specific value.
 *
 * @returns {string} The base URL without a trailing slash.
 */
export function readApiBaseUrl(): string {
    const raw: Perhaps<string> = process.env.EXPO_PUBLIC_API_URL;
    if (raw === undefined || raw.length === 0) {
        throw new Error('Public API URL is not set');
    }
    const trimmed: string = raw.replace(/\/+$/, '');
    if (Platform.OS !== 'android') {
        return trimmed;
    }
    return trimmed.replace(/(https?:\/\/)(?:localhost|127\.0\.0\.1)(?=[:/]|$)/, '$110.0.2.2');
}
