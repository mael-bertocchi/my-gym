import type { FastifyInstance } from 'fastify';
import assistantController from 'src/modules/assistant/assistant-controller';
import type { ConversationParamsRequest, CreateConversationRequest, ListConversationsRequest, SendMessageRequest } from 'src/modules/assistant/assistant-models';
import { CreateConversationSchema, ListConversationsQuerySchema, SendMessageSchema } from 'src/modules/assistant/assistant-models';
import { UuidParamsSchema } from 'src/shared/schemas';

/**
 * @function assistantRoutes
 * @description Defines the coaching-assistant routes (conversations and messages).
 */
export default function (fastify: FastifyInstance): void {
    fastify.get<ListConversationsRequest>('/conversations', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            querystring: ListConversationsQuerySchema
        }
    }, assistantController.listConversations);

    fastify.post<CreateConversationRequest>('/conversations', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            body: CreateConversationSchema
        }
    }, assistantController.createConversation);

    fastify.get<ConversationParamsRequest>('/conversations/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, assistantController.getConversation);

    fastify.post<SendMessageRequest>('/conversations/:id/messages', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema,
            body: SendMessageSchema
        }
    }, assistantController.sendMessage);

    fastify.delete<ConversationParamsRequest>('/conversations/:id', {
        preHandler: [fastify.authentication.authenticate],
        schema: {
            params: UuidParamsSchema
        }
    }, assistantController.deleteConversation);
}
