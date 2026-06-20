import { useAuth } from '@/modules/identity/identity-hook';
import type { WeightUnit } from '@/lib/weight';

/**
 * @function useWeightUnit
 * @description Returns the cached profile's weight unit, defaulting to KG before the profile warms.
 *
 * @returns {WeightUnit} The user's display unit.
 */
export function useWeightUnit(): WeightUnit {
    const { profile } = useAuth();
    if (profile === null) {
        return 'KG';
    }
    return profile.weightUnit;
}
