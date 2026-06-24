import { LoginSchema, LogoutSchema, RefreshSchema } from 'src/modules/identity/identity-models';
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

describe('LogoutSchema', () => {
    it('accepts a non-empty refresh token', () => {
        expect(LogoutSchema.safeParse({ refreshToken: 'abc.def.ghi' }).success).toBe(true);
    });

    it('rejects an empty refresh token', () => {
        expect(LogoutSchema.safeParse({ refreshToken: '' }).success).toBe(false);
    });
});
