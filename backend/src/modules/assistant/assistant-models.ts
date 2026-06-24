import type { RequestGenericInterface } from 'fastify';
import { CursorQuerySchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant ListConversationsQuerySchema
 * @description Zod schema for the list-conversations query string (cursor pagination).
 */
export const ListConversationsQuerySchema = CursorQuerySchema;

/**
 * @constant CreateConversationSchema
 * @description Zod schema for the start-conversation request body.
 */
export const CreateConversationSchema = z.object({
    title: z.string().min(1).max(200).optional()
});

/**
 * @type CreateConversationBody
 * @description Inferred body type for the start-conversation endpoint.
 */
export type CreateConversationBody = z.infer<typeof CreateConversationSchema>;

/**
 * @constant SendMessageSchema
 * @description Zod schema for the send-message request body.
 */
export const SendMessageSchema = z.object({
    content: z.string().min(1).max(4000)
});

/**
 * @type SendMessageBody
 * @description Inferred body type for the send-message endpoint.
 */
export type SendMessageBody = z.infer<typeof SendMessageSchema>;

/**
 * @interface ListConversationsRequest
 * @description Fastify request generic for listing the caller's conversations.
 *
 * @extends RequestGenericInterface
 */
export interface ListConversationsRequest extends RequestGenericInterface {
    Querystring: {
        limit?: number; /*!< Optional page size (1..MAX_LIMIT) */
        cursor?: string; /*!< Optional id of the previous page's last item */
    };
}

/**
 * @interface CreateConversationRequest
 * @description Fastify request generic for starting a conversation.
 *
 * @extends RequestGenericInterface
 */
export interface CreateConversationRequest extends RequestGenericInterface {
    Body: CreateConversationBody; /*!< Validated start-conversation body */
}

/**
 * @interface SendMessageRequest
 * @description Fastify request generic for sending a message to a conversation.
 *
 * @extends RequestGenericInterface
 */
export interface SendMessageRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Conversation identifier */
    };
    Body: SendMessageBody; /*!< Validated send-message body */
}

/**
 * @interface ConversationParamsRequest
 * @description Fastify request generic for operations targeting a single conversation by id.
 *
 * @extends RequestGenericInterface
 */
export interface ConversationParamsRequest extends RequestGenericInterface {
    Params: {
        id: string; /*!< Conversation identifier */
    };
}
