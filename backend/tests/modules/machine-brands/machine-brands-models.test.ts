import { CreateMachineBrandSchema } from 'src/modules/machine-brands/machine-brands-models';
import { describe, expect, it } from 'vitest';

describe('CreateMachineBrandSchema', () => {
    it('accepts a non-empty name', () => {
        expect(CreateMachineBrandSchema.safeParse({ name: 'Matrix' }).success).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(CreateMachineBrandSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects a missing name', () => {
        expect(CreateMachineBrandSchema.safeParse({}).success).toBe(false);
    });
});
