import { CreateBrandSchema } from 'src/modules/brands/brands-models';
import { describe, expect, it } from 'vitest';

describe('CreateBrandSchema', () => {
    it('accepts a non-empty name', () => {
        expect(CreateBrandSchema.safeParse({ name: 'Hammer Strength' }).success).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(CreateBrandSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects a missing name', () => {
        expect(CreateBrandSchema.safeParse({}).success).toBe(false);
    });
});
