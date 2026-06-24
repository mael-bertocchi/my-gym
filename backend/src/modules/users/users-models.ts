import type { RequestGenericInterface } from 'fastify';
import { WeightUnit } from 'prisma/generated/prisma/client';
import { CursorQuerySchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant ListUsersQuerySchema
 * @description Zod schema for the list-users query string (cursor pagination plus an optional search).
 */
export const ListUsersQuerySchema = CursorQuerySchema.extend({
    search: z.string().max(200).optional()
});

/**
 * @constant CreateUserSchema
 * @description Zod schema for the create-user request body.
 */
export const CreateUserSchema = z.object({
    email: z.email(),
    password: z.string().min(8).max(200),
    displayName: z.string().min(1).max(120),
    isAdministrator: z.boolean().optional().default(false),
    weightUnit: z.enum(WeightUnit).optional()
});

/**
 * @type CreateUserBody
 * @description Inferred body type for the create-user endpoint.
 */
export type CreateUserBody = z.infer<typeof CreateUserSchema>;

/**
 * @constant UpdateUserSchema
 * @description Zod schema for the update-user request body. Each field is optional, but at least one must be provided.
 */
export const UpdateUserSchema = z.object({
    displayName: z.string().min(1).max(120).optional(),
    isAdministrator: z.boolean().optional(),
    isActive: z.boolean().optional(),
    weightUnit: z.enum(WeightUnit).optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateUserBody
 * @description Inferred body type for the update-user endpoint.
 */
export type UpdateUserBody = z.infer<typeof UpdateUserSchema>;

/**
 * @constant ResetPasswordSchema
 * @description Zod schema for the administrator reset-password request body.
 */
export const ResetPasswordSchema = z.object({
    newPassword: z.string().min(8).max(200)
});

/**
 * @type ResetPasswordBody
 * @description Inferred body type for the reset-password endpoint.
 */
export type ResetPasswordBody = z.infer<typeof ResetPasswordSchema>;

/**
 * @interface ListUsersRequest
 * @description Fastify request generic for listing accounts with search + cursor pagination.
 *
 * @extends RequestGenericInterface
 */
export interface ListUsersRequest extends RequestGenericInterface {
    Querystring: {
        search?: string; /*!< Optional case-insensitive search across email and display name */
        limit?: number; /*!< Optional page size (1..MAX_LIMIT) */
        cursor?: string; /*!< Optional id of the previous page's last item */
    };
}

/**
 * @interface CreateUserRequest
 * @description Fastify request generic for creating an account.
 *
 * @extends RequestGenericInterface
 */
export interface CreateUserRequest extends RequestGenericInterface {
    Body: CreateUserBody; /*!< Validated create-user body */
}

/**
 * @interface UpdateUserRequest
 * @description Fastify request generic for updating an account.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateUserRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Account identifier */
    };
    Body: UpdateUserBody; /*!< Validated update-user body */
}

/**
 * @interface ResetPasswordRequest
 * @description Fastify request generic for resetting an account's password.
 *
 * @extends RequestGenericInterface
 */
export interface ResetPasswordRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Account identifier */
    };
    Body: ResetPasswordBody; /*!< Validated reset-password body */
}

/**
 * @interface UserParamsRequest
 * @description Fastify request generic for operations targeting a single account by id.
 *
 * @extends RequestGenericInterface
 */
export interface UserParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Account identifier */
    };
}
