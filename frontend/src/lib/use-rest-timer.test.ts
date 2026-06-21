import { computeRemainingSec } from '@/lib/use-rest-timer';

describe('computeRemainingSec', () => {
    it('returns 0 when idle (no target)', () => {
        expect(computeRemainingSec(null, 1000)).toBe(0);
    });
    it('returns the ceil of seconds remaining', () => {
        expect(computeRemainingSec(10_000, 4_200)).toBe(6);
    });
    it('clamps to 0 once the target has passed', () => {
        expect(computeRemainingSec(1_000, 5_000)).toBe(0);
    });
});
