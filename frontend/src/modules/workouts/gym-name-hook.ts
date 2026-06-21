// frontend/src/modules/workouts/gym-name-hook.ts
import { useEffect, useMemo } from 'react';
import { useAuth } from '@/modules/identity/identity-hook';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import type { PaginatedResponse } from '@/lib/use-paginated-query';
import type { ApiClient } from '@/lib/api-client';
import type { Maybe } from '@/shared/models';

/**
 * @interface GymLocationSummary
 * @description The minimal gym-location fields needed for id->name resolution.
 */
export interface GymLocationSummary {
    id: string; /*!< Gym location UUID */
    name: string; /*!< Display name */
}

/**
 * @function listGymLocations
 * @description GET /gym-locations — paginated locations (pageSize 100) for id->name resolution.
 *
 * @param {ApiClient} client The api-client.
 * @param {number} page The 1-based page number.
 * @returns {Promise<PaginatedResponse<GymLocationSummary>>} The paginated locations.
 */
function listGymLocations(client: ApiClient, page: number): Promise<PaginatedResponse<GymLocationSummary>> {
    return client.list<PaginatedResponse<GymLocationSummary>>(`/gym-locations?page=${page}&pageSize=100`);
}

/**
 * @function useGymNameMap
 * @description Prefetches gym locations and exposes an id->name resolver for History rows; auto-fetches subsequent pages so resolution is total.
 *
 * @returns {(gymLocationId: Maybe<string>) => Maybe<string>} A resolver returning the gym name, or null when unknown.
 */
export function useGymNameMap(): (gymLocationId: Maybe<string>) => Maybe<string> {
    const { client } = useAuth();
    const gyms = usePaginatedQuery<GymLocationSummary>(['gym-locations'], (page) => listGymLocations(client, page));
    const { hasNextPage, isFetchingNextPage, fetchNextPage } = gyms;

    useEffect(() => {
        if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return useMemo(() => {
        const lookup: Map<string, string> = new Map();
        const pages = gyms.data?.pages ?? [];
        for (const page of pages) {
            for (const gym of page.data) {
                lookup.set(gym.id, gym.name);
            }
        }
        return (gymLocationId: Maybe<string>): Maybe<string> => {
            if (gymLocationId === null) {
                return null;
            }
            return lookup.get(gymLocationId) ?? null;
        };
    }, [gyms.data]);
}
