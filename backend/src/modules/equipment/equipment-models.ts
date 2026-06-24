import type { RequestGenericInterface } from 'fastify';
import { EquipmentType } from 'prisma/generated/prisma/client';
import { CursorQuerySchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant EquipmentTypeSchema
 * @description Zod schema validating a value against the Prisma EquipmentType enum.
 */
export const EquipmentTypeSchema = z.enum(EquipmentType);

/**
 * @constant ListEquipmentQuerySchema
 * @description Zod schema for the list-equipment query string (cursor pagination plus brand/type/name filters).
 */
export const ListEquipmentQuerySchema = CursorQuerySchema.extend({
    brandId: z.uuid().optional(),
    type: EquipmentTypeSchema.optional(),
    search: z.string().max(200).optional()
});

/**
 * @constant CreateEquipmentSchema
 * @description Zod schema for the create-equipment request body.
 */
export const CreateEquipmentSchema = z.object({
    name: z.string().min(1).max(120),
    type: EquipmentTypeSchema,
    brandId: z.uuid().optional()
});

/**
 * @type CreateEquipmentBody
 * @description Inferred body type for the create-equipment endpoint.
 */
export type CreateEquipmentBody = z.infer<typeof CreateEquipmentSchema>;

/**
 * @constant UpdateEquipmentSchema
 * @description Zod schema for the update-equipment request body. Each field is optional, but at least one must be provided. A null brandId clears the brand.
 */
export const UpdateEquipmentSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    type: EquipmentTypeSchema.optional(),
    brandId: z.uuid().nullable().optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
});

/**
 * @type UpdateEquipmentBody
 * @description Inferred body type for the update-equipment endpoint.
 */
export type UpdateEquipmentBody = z.infer<typeof UpdateEquipmentSchema>;

/**
 * @interface ListEquipmentRequest
 * @description Fastify request generic for listing equipment with brand/type/name filters + cursor pagination.
 *
 * @extends RequestGenericInterface
 */
export interface ListEquipmentRequest extends RequestGenericInterface {
    Querystring: {
        brandId?: string; /*!< Optional brand filter */
        type?: EquipmentType; /*!< Optional equipment-type filter */
        search?: string; /*!< Optional case-insensitive search across the equipment name */
        limit?: number; /*!< Optional page size (1..MAX_LIMIT) */
        cursor?: string; /*!< Optional id of the previous page's last item */
    };
}

/**
 * @interface CreateEquipmentRequest
 * @description Fastify request generic for creating equipment.
 *
 * @extends RequestGenericInterface
 */
export interface CreateEquipmentRequest extends RequestGenericInterface {
    Body: CreateEquipmentBody; /*!< Validated create-equipment body */
}

/**
 * @interface UpdateEquipmentRequest
 * @description Fastify request generic for updating equipment.
 *
 * @extends RequestGenericInterface
 */
export interface UpdateEquipmentRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Equipment identifier */
    };
    Body: UpdateEquipmentBody; /*!< Validated update-equipment body */
}

/**
 * @interface EquipmentParamsRequest
 * @description Fastify request generic for operations targeting a single piece of equipment by id.
 *
 * @extends RequestGenericInterface
 */
export interface EquipmentParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Equipment identifier */
    };
}
