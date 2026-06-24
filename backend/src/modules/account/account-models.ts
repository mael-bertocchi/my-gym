import type { RequestGenericInterface } from 'fastify';
import { WeightUnit } from 'prisma/generated/prisma/client';
import { z } from 'zod';

/**
 * @constant UpdateProfileSchema
 * @description Zod schema for updating the current user's profile. Each field is optional, but at least one must be provided. A null defaultGymId clears the home gym.
 */
export const UpdateProfileSchema = z.object({
    displayName: z.string().min(1).max(120).optional(),
    weightUnit: z.enum(WeightUnit).optional(),
    defaultGymId: z.uuid().nullable().optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateProfileBody
 * @description Inferred body type for the update-profile endpoint.
 */
export type UpdateProfileBody = z.infer<typeof UpdateProfileSchema>;

/**
 * @constant ChangePasswordSchema
 * @description Zod schema for changing the current user's password.
 */
export const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(200)
});

/**
 * @type ChangePasswordBody
 * @description Inferred body type for the change-password endpoint.
 */
export type ChangePasswordBody = z.infer<typeof ChangePasswordSchema>;

/**
 * @interface UpdateProfileRequest
 * @description Fastify request generic for updating the current user's profile.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateProfileRequest extends RequestGenericInterface {
    Body: UpdateProfileBody; /*!< Validated update-profile body */
}

/**
 * @interface ChangePasswordRequest
 * @description Fastify request generic for changing the current user's password.
 *
 * @extends RequestGenericInterface
 */
export interface ChangePasswordRequest extends RequestGenericInterface {
    Body: ChangePasswordBody; /*!< Validated change-password body */
}
