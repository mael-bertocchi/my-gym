import { humanizeEnum, deriveAiState } from '@/modules/exercise-library/exercise-library-models';

describe('humanizeEnum', () => {
    it('title-cases a single-word enum', () => {
        expect(humanizeEnum('CHEST')).toBe('Chest');
    });
    it('joins multi-word enums with spaces and lowercases the tail', () => {
        expect(humanizeEnum('SIDE_DELTS')).toBe('Side delts');
    });
    it('handles three-word enums', () => {
        expect(humanizeEnum('SMITH_MACHINE')).toBe('Smith machine');
    });
    it('returns an empty string unchanged', () => {
        expect(humanizeEnum('')).toBe('');
    });
});

describe('deriveAiState', () => {
    it('maps PENDING to the pending card state', () => {
        expect(deriveAiState('PENDING')).toBe('pending');
    });
    it('maps GENERATED to the generated card state', () => {
        expect(deriveAiState('GENERATED')).toBe('generated');
    });
    it('maps FAILED to the failed card state', () => {
        expect(deriveAiState('FAILED')).toBe('failed');
    });
});
