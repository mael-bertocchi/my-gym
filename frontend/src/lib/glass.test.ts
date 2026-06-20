import { selectGlassTier } from '@/lib/glass';

describe('selectGlassTier', () => {
    it('returns solid when Reduce Transparency is on', () => {
        expect(selectGlassTier({ reduceTransparency: true, liquidGlassAvailable: true })).toBe('solid');
    });
    it('returns liquid when API is available and transparency allowed', () => {
        expect(selectGlassTier({ reduceTransparency: false, liquidGlassAvailable: true })).toBe('liquid');
    });
    it('falls back to blur when no liquid glass but transparency allowed', () => {
        expect(selectGlassTier({ reduceTransparency: false, liquidGlassAvailable: false })).toBe('blur');
    });
});
