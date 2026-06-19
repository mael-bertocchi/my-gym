import { GoogleGenAI } from '@google/genai';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * @type ChatMessageRole
 * @description Roles accepted by the Gemini chat API ('model' is the assistant turn).
 */
type ChatMessageRole = 'user' | 'model';

/**
 * @interface ChatMessage
 * @description A single message in a conversation.
 */
interface ChatMessage {
    role: ChatMessageRole; /*!< The role of the message sender */
    content: string; /*!< The textual content of the message */
}

/**
 * @interface ChatOptions
 * @description Options for a JSON-mode generation request.
 */
interface ChatOptions {
    system: string; /*!< System instruction that sets the context of the conversation */
    messages: ChatMessage[]; /*!< An array of messages representing the conversation history */
    temperature: number; /*!< Temperature setting for response variability (0..2) */
}

/**
 * @interface StreamChatOptions
 * @description Options for a streaming, freeform generation request.
 */
export interface StreamChatOptions {
    system: string; /*!< System instruction that sets the context of the conversation */
    messages: ChatMessage[]; /*!< An array of messages representing the conversation history */
    temperature: number; /*!< Temperature setting for response variability (0..2) */
    signal?: AbortSignal; /*!< Optional abort signal used to cancel the upstream request */
}

/**
 * @interface GoogleAI
 * @description Public interface exposed on the Fastify instance.
 */
export interface GoogleAI {
    chat: <T>(options: ChatOptions) => Promise<T>; /*!< Single-shot JSON-mode completion used by exercise onboarding */
    stream: (options: StreamChatOptions) => AsyncIterable<string>; /*!< Incremental text stream for the freeform assistant */
    ping: () => Promise<void>; /*!< Lightweight reachability check used by the health endpoint */
}

/**
 * @function toContents
 * @description Maps the caller's chat messages to the @google/genai content format.
 *
 * @param {ChatMessage[]} messages The conversation history.
 * @returns {{ role: ChatMessageRole; parts: { text: string }[] }[]} The SDK content list.
 */
function toContents(messages: ChatMessage[]): { role: ChatMessageRole; parts: { text: string }[] }[] {
    return messages.map((message) => ({ role: message.role, parts: [{ text: message.content }] }));
}

/**
 * @function googleAIPlugin
 * @description Fastify plugin integrating with Google AI Studio (Gemini) through the @google/genai SDK.
 */
export default fp(function (fastify: FastifyInstance): void {
    const client = new GoogleGenAI({ apiKey: fastify.variables.GOOGLE_AI_API_KEY });
    const model = fastify.variables.GOOGLE_AI_MODEL;

    fastify.decorate('ai', {
        async chat<T>(options: ChatOptions): Promise<T> {
            if (options.temperature < 0 || options.temperature > 2) {
                throw new Error('Temperature must be between 0 and 2');
            }

            const response = await client.models.generateContent({
                model,
                contents: toContents(options.messages),
                config: {
                    systemInstruction: `${options.system}\nAlways respond with a single valid JSON object.`,
                    temperature: options.temperature,
                    responseMimeType: 'application/json'
                }
            });

            const text = response.text;
            if (text === undefined || text.length < 1) {
                throw new Error('Google AI returned an empty response');
            }

            const parsed: unknown = JSON.parse(text);

            return parsed as T;
        },

        async *stream(options: StreamChatOptions): AsyncGenerator<string, void, void> {
            if (options.temperature < 0 || options.temperature > 2) {
                throw new Error('Temperature must be between 0 and 2');
            }

            const response = await client.models.generateContentStream({
                model,
                contents: toContents(options.messages),
                config: {
                    systemInstruction: options.system,
                    temperature: options.temperature,
                    abortSignal: options.signal
                }
            });

            for await (const chunk of response) {
                const text = chunk.text;
                if (text !== undefined && text.length > 0) {
                    yield text;
                }
            }
        },

        async ping(): Promise<void> {
            await client.models.generateContent({ model, contents: 'ping' });
        }
    });
}, {
    name: 'ai',
    dependencies: ['environment']
});
