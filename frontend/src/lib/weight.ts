import type { Maybe } from '@/shared/models';

/**
 * @type WeightUnit
 * @description The user's weight display unit. Mirrors the backend enum; weight is always stored as kg.
 */
export type WeightUnit = 'KG' | 'LBS';

/**
 * @constant KG_PER_LB
 * @description Kilograms in one pound, used for display-only kg↔lbs conversion.
 */
export const KG_PER_LB: number = 0.45359237;

/**
 * @function parseDecimal
 * @description Parses a user-typed decimal string into a number, returning null when unparseable (the API takes decimals as strings; this is the inverse for entry).
 *
 * @param {string} input The raw string from a numeric field.
 * @returns {Maybe<number>} The parsed number, or null.
 */
export function parseDecimal(input: string): Maybe<number> {
    const trimmed: string = input.trim().replace(',', '.');
    if (trimmed.length === 0) {
        return null;
    }
    const value: number = Number(trimmed);
    if (!Number.isFinite(value)) {
        return null;
    }
    return value;
}

/**
 * @function formatWeight
 * @description Formats a kg-stored weight for display in the user's unit. Null (bodyweight) renders as an em dash.
 *
 * @param {Maybe<number>} weightKg The stored weight in kilograms, or null for bodyweight.
 * @param {WeightUnit} unit The user's display unit.
 * @returns {string} The formatted, unit-suffixed string.
 */
export function formatWeight(weightKg: Maybe<number>, unit: WeightUnit): string {
    if (weightKg === null) {
        return '—';
    }
    if (unit !== 'LBS') {
        return `${Math.round(weightKg * 100) / 100} kg`;
    }
    return `${Math.round(weightKg / KG_PER_LB)} lbs`;
}
