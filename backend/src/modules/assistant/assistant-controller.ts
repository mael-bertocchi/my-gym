import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { MessageRole } from 'prisma/generated/prisma/client';
import { generateReply } from 'src/modules/assistant/assistant-advice';
import { loadAssistantContext } from 'src/modules/assistant/assistant-context';
import type { ConversationParamsRequest, CreateConversationRequest, ListConversationsRequest, SendMessageRequest } from 'src/modules/assistant/assistant-models';
import { RequestError } from 'src/shared/models';
import { buildCursorPage, parseCursor } from 'src/shared/pagination';

/**
 * @function listConversations
 * @description Lists the caller's conversations with cursor pagination, most recently active first.
 *
 * @returns {Promise<void>} Resolves when the list is sent.
 */
async function listConversations(request: FastifyRequest<ListConversationsRequest>, reply: FastifyReply): Promise<void> {
    const { take, limit, cursor, skip } = parseCursor(request.query);

    const rows = await request.server.prisma.conversation.findMany({
        where: { userId: request.user.id },
        select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take,
        cursor,
        skip
    });

    reply.status(StatusCodes.OK).send(buildCursorPage(rows, limit));
}

/**
 * @function createConversation
 * @description Starts a new, empty conversation for the caller.
 *
 * @returns {Promise<void>} Resolves when the conversation is created.
 */
async function createConversation(request: FastifyRequest<CreateConversationRequest>, reply: FastifyReply): Promise<void> {
    const created = await request.server.prisma.conversation.create({
        data: { userId: request.user.id, title: request.body.title },
        select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true
        }
    });

    reply.status(StatusCodes.CREATED).send({ data: created });
}

/**
 * @function getConversation
 * @description Retrieves one of the caller's conversations with its messages.
 *
 * @returns {Promise<void>} Resolves when the conversation is sent.
 */
async function getConversation(request: FastifyRequest<ConversationParamsRequest>, reply: FastifyReply): Promise<void> {
    const conversation = await request.server.prisma.conversation.findFirst({
        where: { id: request.params.id, userId: request.user.id },
        select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            messages: {
                orderBy: { createdAt: 'asc' },
                select: { id: true, role: true, content: true, createdAt: true }
            }
        }
    });

    if (conversation === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Conversation not found');
    }

    reply.status(StatusCodes.OK).send({ data: conversation });
}

/**
 * @function sendMessage
 * @description Stores the caller's message, generates the assistant's reply grounded in the caller's training data, persists it, and returns it.
 *
 * @returns {Promise<void>} Resolves when the reply is sent.
 */
async function sendMessage(request: FastifyRequest<SendMessageRequest>, reply: FastifyReply): Promise<void> {
    const conversation = await request.server.prisma.conversation.findFirst({
        where: { id: request.params.id, userId: request.user.id }
    });

    if (conversation === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Conversation not found');
    }

    await request.server.prisma.message.create({
        data: { conversationId: request.params.id, role: MessageRole.USER, content: request.body.content }
    });

    const history = await request.server.prisma.message.findMany({
        where: { conversationId: request.params.id },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true }
    });

    const context = await loadAssistantContext(request.server.prisma, request.user.id);

    const turns = history.map((message) => ({
        role: message.role === MessageRole.USER ? 'user' as const : 'model' as const,
        content: message.content
    }));

    const replyText = await generateReply(request.server.ai, context, turns);

    const assistantMessage = await request.server.prisma.message.create({
        data: { conversationId: request.params.id, role: MessageRole.ASSISTANT, content: replyText },
        select: {
            id: true,
            role: true,
            content: true,
            createdAt: true
        }
    });

    await request.server.prisma.conversation.update({
        where: { id: request.params.id },
        data: { updatedAt: new Date() }
    });

    reply.status(StatusCodes.CREATED).send({ data: { message: assistantMessage } });
}

/**
 * @function deleteConversation
 * @description Deletes one of the caller's conversations and its messages.
 *
 * @returns {Promise<void>} Resolves when the conversation is deleted.
 */
async function deleteConversation(request: FastifyRequest<ConversationParamsRequest>, reply: FastifyReply): Promise<void> {
    const existing = await request.server.prisma.conversation.findFirst({
        where: { id: request.params.id, userId: request.user.id }
    });

    if (existing === null) {
        throw new RequestError(StatusCodes.NOT_FOUND, 'Conversation not found');
    }

    await request.server.prisma.conversation.delete({ where: { id: request.params.id } });

    reply.status(StatusCodes.OK).send({ data: { message: 'Conversation deleted' } });
}

export default {
    listConversations,
    createConversation,
    getConversation,
    sendMessage,
    deleteConversation
};
