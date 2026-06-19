import { CreateGymBrandSchema } from 'src/modules/gym-brands/gym-brands-models';
import { describe, expect, it } from 'vitest';

describe('CreateGymBrandSchema', () => {
    it('accepts a non-empty name', () => {
        expect(CreateGymBrandSchema.safeParse({ name: 'Basic Fit' }).success).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(CreateGymBrandSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects a missing name', () => {
        expect(CreateGymBrandSchema.safeParse({}).success).toBe(false);
    });
});
