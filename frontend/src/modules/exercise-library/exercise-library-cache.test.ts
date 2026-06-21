import { prependVariant, replaceVariant, patchVariant, removeVariant } from '@/modules/exercise-library/exercise-library-cache';
import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedResponse } from '@/lib/use-paginated-query';
import type { ExerciseVariant } from '@/modules/exercise-library/exercise-library-models';

/**
 * @function makeVariant
 * @description Builds a minimal variant for cache tests.
 *
 * @param {string} id The variant id.
 * @param {Partial<ExerciseVariant>} overrides Field overrides.
 * @returns {ExerciseVariant} The variant.
 */
function makeVariant(id: string, overrides: Partial<ExerciseVariant>): ExerciseVariant {
    return {
        id,
        exerciseId: 'ex1',
        equipmentType: 'BARBELL',
        machineBrandId: null,
        formSummary: null,
        instructions: null,
        equipmentTips: null,
        previewImageUrl: null,
        aiContentStatus: 'PENDING',
        aiGeneratedAt: null,
        createdAt: '2026-06-21T00:00:00.000Z',
        updatedAt: '2026-06-21T00:00:00.000Z',
        ...overrides
    };
}

/**
 * @function makePages
 * @description Wraps variants into a single-page InfiniteData fixture.
 *
 * @param {ExerciseVariant[]} variants The page contents.
 * @returns {InfiniteData<PaginatedResponse<ExerciseVariant>, number>} The infinite-data fixture.
 */
function makePages(variants: ExerciseVariant[]): InfiniteData<PaginatedResponse<ExerciseVariant>, number> {
    return { pages: [{ data: variants, pagination: { page: 1, pageSize: 25, total: variants.length, totalPages: 1 } }], pageParams: [1] };
}

describe('exercise-library-cache', () => {
    it('returns undefined unchanged when prev is undefined', () => {
        expect(prependVariant(undefined, makeVariant('a', {}))).toBeUndefined();
    });

    it('prepends a variant to the first page without mutating the input', () => {
        const prev = makePages([makeVariant('a', {})]);
        const next = prependVariant(prev, makeVariant('b', {}));
        expect(next?.pages[0]?.data.map((v) => v.id)).toEqual(['b', 'a']);
        expect(prev.pages[0]?.data.map((v) => v.id)).toEqual(['a']);
    });

    it('replaces a matching variant by id across pages', () => {
        const prev = makePages([makeVariant('temp', {}), makeVariant('a', {})]);
        const server = makeVariant('real', { aiContentStatus: 'GENERATED' });
        const next = replaceVariant(prev, 'temp', server);
        expect(next?.pages[0]?.data.map((v) => v.id)).toEqual(['real', 'a']);
        expect(next?.pages[0]?.data[0]?.aiContentStatus).toBe('GENERATED');
    });

    it('patches fields only on the matching variant', () => {
        const prev = makePages([makeVariant('a', { aiContentStatus: 'FAILED' }), makeVariant('b', { aiContentStatus: 'GENERATED' })]);
        const next = patchVariant(prev, 'a', { aiContentStatus: 'PENDING' });
        expect(next?.pages[0]?.data[0]?.aiContentStatus).toBe('PENDING');
        expect(next?.pages[0]?.data[1]?.aiContentStatus).toBe('GENERATED');
    });

    it('removes a variant by id', () => {
        const prev = makePages([makeVariant('a', {}), makeVariant('b', {})]);
        const next = removeVariant(prev, 'a');
        expect(next?.pages[0]?.data.map((v) => v.id)).toEqual(['b']);
    });
});
