import { LoginSchema, RefreshSchema, UpdateProfileSchema } from 'src/modules/identity/identity-models';
import { describe, expect, it } from 'vitest';

describe('LoginSchema', () => {
    it('accepts a valid email and password', () => {
        expect(LoginSchema.safeParse({ email: 'me@example.com', password: 'secret' }).success).toBe(true);
    });

    it('rejects an invalid email', () => {
        expect(LoginSchema.safeParse({ email: 'nope', password: 'secret' }).success).toBe(false);
    });

    it('rejects an empty password', () => {
        expect(LoginSchema.safeParse({ email: 'me@example.com', password: '' }).success).toBe(false);
    });
});

describe('RefreshSchema', () => {
    it('accepts a non-empty refresh token', () => {
        expect(RefreshSchema.safeParse({ refreshToken: 'abc.def.ghi' }).success).toBe(true);
    });

    it('rejects an empty refresh token', () => {
        expect(RefreshSchema.safeParse({ refreshToken: '' }).success).toBe(false);
    });
});

describe('UpdateProfileSchema', () => {
    it('accepts a partial update', () => {
        expect(UpdateProfileSchema.safeParse({ firstname: 'Mael' }).success).toBe(true);
    });

    it('rejects a too-short password', () => {
        expect(UpdateProfileSchema.safeParse({ password: 'short' }).success).toBe(false);
    });

    it('accepts a weightUnit update', () => {
        const result = UpdateProfileSchema.safeParse({ weightUnit: 'LBS' });

        expect(result.success).toBe(true);
        expect(result.data?.weightUnit).toBe('LBS');
    });

    it('rejects an unknown weightUnit', () => {
        expect(UpdateProfileSchema.safeParse({ weightUnit: 'STONE' }).success).toBe(false);
    });

    it('rejects an empty update', () => {
        expect(UpdateProfileSchema.safeParse({}).success).toBe(false);
    });
});
