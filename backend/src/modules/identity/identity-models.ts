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
 * @constant LogoutSchema
 * @description Zod schema for the logout request body (the refresh token to invalidate).
 */
export const LogoutSchema = z.object({
    refreshToken: z.string().min(1)
});

/**
 * @type LogoutBody
 * @description Inferred body type for the logout endpoint.
 */
export type LogoutBody = z.infer<typeof LogoutSchema>;

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
 * @interface LogoutRequest
 * @description Fastify request generic for the logout endpoint.
 *
 * @extends RequestGenericInterface
 */
export interface LogoutRequest extends RequestGenericInterface {
    Body: LogoutBody; /*!< Validated logout body */
}
