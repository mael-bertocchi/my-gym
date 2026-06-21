import { exerciseKeys } from '@/modules/exercise-library/exercise-library-hook';

describe('exerciseKeys', () => {
    it('namespaces the exercises list by search term', () => {
        expect(exerciseKeys.list('bench')).toEqual(['exercises', 'list', 'bench']);
    });
    it('uses a stable empty-search key', () => {
        expect(exerciseKeys.list('')).toEqual(['exercises', 'list', '']);
    });
    it('keys an exercise detail by id', () => {
        expect(exerciseKeys.detail('ex1')).toEqual(['exercises', 'detail', 'ex1']);
    });
    it('keys variants by exercise id', () => {
        expect(exerciseKeys.variants('ex1')).toEqual(['exercise-variants', 'ex1']);
    });
    it('keys brands by search term', () => {
        expect(exerciseKeys.brands('')).toEqual(['machine-brands', '']);
    });
    it('exposes a brands root prefix for invalidation', () => {
        expect(exerciseKeys.brandsRoot()).toEqual(['machine-brands']);
    });
});
