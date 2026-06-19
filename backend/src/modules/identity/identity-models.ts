import type { RequestGenericInterface } from 'fastify';
import { z } from 'zod';

/**
 * @constant LoginSchema
 * @description Zod schema for the login request body.
 */
export const LoginSchema = z.object({
    email: z.email(),
    password: z.string().min(1)
});

/**
 * @type LoginBody
 * @description Inferred body type for the login endpoint.
 */
export type LoginBody = z.infer<typeof LoginSchema>;

/**
 * @constant RefreshSchema
 * @description Zod schema for the refresh request body.
 */
export const RefreshSchema = z.object({
    refreshToken: z.string().min(1)
});

/**
 * @type RefreshBody
 * @description Inferred body type for the refresh endpoint.
 */
export type RefreshBody = z.infer<typeof RefreshSchema>;

/**
 * @constant UpdateProfileSchema
 * @description Zod schema for updating the current user's profile. Each field is optional, but at least one must be provided.
 */
export const UpdateProfileSchema = z.object({
    firstname: z.string().min(1).max(80).optional(),
    lastname: z.string().min(1).max(80).optional(),
    password: z.string().min(8).max(200).optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateProfileBody
 * @description Inferred body type for the update-profile endpoint.
 */
export type UpdateProfileBody = z.infer<typeof UpdateProfileSchema>;

/**
 * @interface LoginRequest
 * @description Fastify request generic for the login endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface LoginRequest extends RequestGenericInterface {
    Body: LoginBody; /*!< Validated login body */
}

/**
 * @interface RefreshRequest
 * @description Fastify request generic for the refresh endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface RefreshRequest extends RequestGenericInterface {
    Body: RefreshBody; /*!< Validated refresh body */
}

/**
 * @interface UpdateProfileRequest
 * @description Fastify request generic for the update-profile endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateProfileRequest extends RequestGenericInterface {
    Body: UpdateProfileBody; /*!< Validated update-profile body */
}
