import { CreateGymSchema, UpdateGymSchema } from 'src/modules/gyms/gyms-models';
import { describe, expect, it } from 'vitest';

describe('CreateGymSchema', () => {
    it('accepts a name with optional address and notes', () => {
        expect(CreateGymSchema.safeParse({ name: 'Iron Temple', address: '1 Main St', notes: 'Chalk allowed' }).success).toBe(true);
    });

    it('accepts a name alone', () => {
        expect(CreateGymSchema.safeParse({ name: 'Home Gym' }).success).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(CreateGymSchema.safeParse({ name: '' }).success).toBe(false);
    });
});

describe('UpdateGymSchema', () => {
    it('rejects an empty update', () => {
        expect(UpdateGymSchema.safeParse({}).success).toBe(false);
    });

    it('accepts clearing the address with null', () => {
        expect(UpdateGymSchema.safeParse({ address: null }).success).toBe(true);
    });
});
