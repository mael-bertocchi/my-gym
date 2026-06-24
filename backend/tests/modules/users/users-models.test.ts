import { CreateUserSchema, UpdateUserSchema } from 'src/modules/users/users-models';
import { describe, expect, it } from 'vitest';

describe('CreateUserSchema', () => {
    it('accepts a valid account', () => {
        expect(CreateUserSchema.safeParse({ email: 'a@b.com', password: 'long-enough', displayName: 'Athlete' }).success).toBe(true);
    });

    it('defaults isAdministrator to false', () => {
        const result = CreateUserSchema.safeParse({ email: 'a@b.com', password: 'long-enough', displayName: 'Athlete' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.isAdministrator).toBe(false);
        }
    });

    it('rejects a too-short password', () => {
        expect(CreateUserSchema.safeParse({ email: 'a@b.com', password: 'short', displayName: 'Athlete' }).success).toBe(false);
    });
});

describe('UpdateUserSchema', () => {
    it('rejects an empty update', () => {
        expect(UpdateUserSchema.safeParse({}).success).toBe(false);
    });

    it('accepts toggling isAdministrator', () => {
        expect(UpdateUserSchema.safeParse({ isAdministrator: true }).success).toBe(true);
    });
});
