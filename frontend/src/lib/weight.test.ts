import { formatWeight, parseDecimal, KG_PER_LB } from '@/lib/weight';

describe('parseDecimal', () => {
    it('parses a plain decimal string', () => {
        expect(parseDecimal('42.5')).toBe(42.5);
    });
    it('returns null for an unparseable string', () => {
        expect(parseDecimal('abc')).toBeNull();
    });
    it('returns null for empty input', () => {
        expect(parseDecimal('')).toBeNull();
    });
});

describe('formatWeight', () => {
    it('renders an em dash for bodyweight (null)', () => {
        expect(formatWeight(null, 'KG')).toBe('—');
    });
    it('keeps kg unchanged when unit is KG', () => {
        expect(formatWeight(100, 'KG')).toBe('100 kg');
    });
    it('converts kg to lbs when unit is LBS', () => {
        expect(formatWeight(100, 'LBS')).toBe(`${Math.round(100 / KG_PER_LB)} lbs`);
    });
});
