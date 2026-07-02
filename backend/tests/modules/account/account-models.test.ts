import { ChangePasswordSchema, UpdateProfileSchema } from 'src/modules/account/account-models';
import { describe, expect, it } from 'vitest';

describe('UpdateProfileSchema', () => {
    it('accepts a display-name update', () => {
        expect(UpdateProfileSchema.safeParse({ displayName: 'Maël Bertocchi' }).success).toBe(true);
    });

    it('accepts clearing the default gym with null', () => {
        expect(UpdateProfileSchema.safeParse({ defaultGymId: null }).success).toBe(true);
    });

    it('rejects an unknown weightUnit', () => {
        expect(UpdateProfileSchema.safeParse({ weightUnit: 'STONE' }).success).toBe(false);
    });

    it('rejects an empty update', () => {
        expect(UpdateProfileSchema.safeParse({}).success).toBe(false);
    });
});

describe('ChangePasswordSchema', () => {
    it('accepts a current and new password', () => {
        expect(ChangePasswordSchema.safeParse({ currentPassword: 'old-secret', newPassword: 'a-new-secret' }).success).toBe(true);
    });

    it('rejects a too-short new password', () => {
        expect(ChangePasswordSchema.safeParse({ currentPassword: 'old-secret', newPassword: 'short' }).success).toBe(false);
    });
});
