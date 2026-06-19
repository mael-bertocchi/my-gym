import { CreateGymLocationSchema, UpdateGymLocationSchema } from 'src/modules/gym-locations/gym-locations-models';
import { describe, expect, it } from 'vitest';

describe('CreateGymLocationSchema', () => {
    it('accepts a brand id, name, and optional city/address', () => {
        expect(CreateGymLocationSchema.safeParse({ gymBrandId: '11111111-1111-4111-8111-111111111111', name: 'République', city: 'Paris' }).success).toBe(true);
    });

    it('rejects a missing gymBrandId', () => {
        expect(CreateGymLocationSchema.safeParse({ name: 'République' }).success).toBe(false);
    });

    it('rejects an invalid gymBrandId', () => {
        expect(CreateGymLocationSchema.safeParse({ gymBrandId: 'nope', name: 'République' }).success).toBe(false);
    });

    it('rejects an empty name', () => {
        expect(CreateGymLocationSchema.safeParse({ gymBrandId: '11111111-1111-4111-8111-111111111111', name: '' }).success).toBe(false);
    });
});

describe('UpdateGymLocationSchema', () => {
    it('accepts a single-field update', () => {
        expect(UpdateGymLocationSchema.safeParse({ city: 'Lyon' }).success).toBe(true);
    });

    it('rejects an empty update', () => {
        expect(UpdateGymLocationSchema.safeParse({}).success).toBe(false);
    });
});
