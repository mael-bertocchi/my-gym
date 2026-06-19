import { QueryClient } from '@tanstack/react-query';

/**
 * @function createQueryClient
 * @description Builds the app's TanStack Query client with conservative retry/staleness for a mobile session.
 *
 * @returns {QueryClient} The configured query client.
 */
export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false }
        }
    });
}
