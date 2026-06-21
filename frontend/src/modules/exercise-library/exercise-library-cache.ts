import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedResponse } from '@/lib/use-paginated-query';
import type { ExerciseVariant } from '@/modules/exercise-library/exercise-library-models';
import type { Perhaps } from '@/shared/models';

/**
 * @type VariantPages
 * @description The cached infinite-data shape for a variants list (undefined before the first fetch).
 */
export type VariantPages = Perhaps<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>;

/**
 * @function mapPages
 * @description Returns a new VariantPages whose every page's data array is transformed, leaving the input untouched.
 *
 * @param {VariantPages} prev The previous cache value.
 * @param {(variants: ExerciseVariant[]) => ExerciseVariant[]} transform The per-page data transform.
 * @returns {VariantPages} The new cache value, or undefined when prev is undefined.
 */
function mapPages(prev: VariantPages, transform: (variants: ExerciseVariant[]) => ExerciseVariant[]): VariantPages {
    if (prev === undefined) {
        return undefined;
    }
    return {
        ...prev,
        pages: prev.pages.map((page) => ({ ...page, data: transform(page.data) }))
    };
}

/**
 * @function prependVariant
 * @description Inserts a variant at the front of the first page.
 *
 * @param {VariantPages} prev The previous cache value.
 * @param {ExerciseVariant} variant The variant to prepend.
 * @returns {VariantPages} The updated cache value.
 */
export function prependVariant(prev: VariantPages, variant: ExerciseVariant): VariantPages {
    if (prev === undefined) {
        return undefined;
    }
    const [first, ...rest] = prev.pages;
    if (first === undefined) {
        return prev;
    }
    return { ...prev, pages: [{ ...first, data: [variant, ...first.data] }, ...rest] };
}

/**
 * @function replaceVariant
 * @description Replaces the variant whose id equals matchId with the supplied variant, across all pages.
 *
 * @param {VariantPages} prev The previous cache value.
 * @param {string} matchId The id to replace.
 * @param {ExerciseVariant} variant The replacement variant.
 * @returns {VariantPages} The updated cache value.
 */
export function replaceVariant(prev: VariantPages, matchId: string, variant: ExerciseVariant): VariantPages {
    return mapPages(prev, (variants) => variants.map((current) => (current.id !== matchId ? current : variant)));
}

/**
 * @function patchVariant
 * @description Shallow-merges a partial patch into the variant whose id equals variantId, across all pages.
 *
 * @param {VariantPages} prev The previous cache value.
 * @param {string} variantId The id to patch.
 * @param {Partial<ExerciseVariant>} patch The fields to merge.
 * @returns {VariantPages} The updated cache value.
 */
export function patchVariant(prev: VariantPages, variantId: string, patch: Partial<ExerciseVariant>): VariantPages {
    return mapPages(prev, (variants) => variants.map((current) => (current.id !== variantId ? current : { ...current, ...patch })));
}

/**
 * @function removeVariant
 * @description Drops the variant whose id equals variantId, across all pages.
 *
 * @param {VariantPages} prev The previous cache value.
 * @param {string} variantId The id to remove.
 * @returns {VariantPages} The updated cache value.
 */
export function removeVariant(prev: VariantPages, variantId: string): VariantPages {
    return mapPages(prev, (variants) => variants.filter((current) => current.id !== variantId));
}
