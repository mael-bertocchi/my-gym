import { workoutKeys } from '@/modules/workouts/workouts-hook';

describe('workoutKeys', () => {
    it('exposes a list root prefix for invalidation', () => {
        expect(workoutKeys.lists()).toEqual(['workouts', 'list']);
    });
    it('keys a filtered list by gym id (empty string for all)', () => {
        expect(workoutKeys.list('gym1')).toEqual(['workouts', 'list', 'gym1']);
        expect(workoutKeys.list('')).toEqual(['workouts', 'list', '']);
    });
    it('keys a workout detail by id', () => {
        expect(workoutKeys.detail('w1')).toEqual(['workouts', 'detail', 'w1']);
    });
    it('keys variant stats by id', () => {
        expect(workoutKeys.stats('v1')).toEqual(['variant-stats', 'v1']);
    });
});
