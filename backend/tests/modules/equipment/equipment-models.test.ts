import { CreateEquipmentSchema, UpdateEquipmentSchema } from 'src/modules/equipment/equipment-models';
import { describe, expect, it } from 'vitest';

const BRAND_ID = '33333333-3333-4333-8333-333333333333';

describe('CreateEquipmentSchema', () => {
    it('accepts a name and type', () => {
        expect(CreateEquipmentSchema.safeParse({ name: 'Chest Press', type: 'MACHINE' }).success).toBe(true);
    });

    it('accepts an optional brandId', () => {
        expect(CreateEquipmentSchema.safeParse({ name: 'Chest Press', type: 'MACHINE', brandId: BRAND_ID }).success).toBe(true);
    });

    it('rejects an unknown type', () => {
        expect(CreateEquipmentSchema.safeParse({ name: 'Rower', type: 'ROWER' }).success).toBe(false);
    });

    it('rejects a missing type', () => {
        expect(CreateEquipmentSchema.safeParse({ name: 'Chest Press' }).success).toBe(false);
    });
});

describe('UpdateEquipmentSchema', () => {
    it('rejects an empty update', () => {
        expect(UpdateEquipmentSchema.safeParse({}).success).toBe(false);
    });

    it('accepts clearing the brand with null', () => {
        expect(UpdateEquipmentSchema.safeParse({ brandId: null }).success).toBe(true);
    });
});
