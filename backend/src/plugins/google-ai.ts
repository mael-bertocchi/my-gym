import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { z } from 'zod';

/**
 * @constant GOOGLE_AI_BASE_URL
 * @description Base URL of the Google AI Studio (Gemini) REST API.
 */
export const GOOGLE_AI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

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
 * @interface ToolDefinition
 * @description A Gemini function declaration advertised to the model.
 */
export interface ToolDefinition {
    name: string; /*!< Function name */
    description: string; /*!< Function description used by the model when deciding whether to call it */
    parameters: Record<string, unknown>; /*!< JSON Schema for the function's arguments */
}

/**
 * @interface StreamChatOptions
 * @description Options for a streaming, freeform generation request.
 */
export interface StreamChatOptions {
    system: string; /*!< System instruction that sets the context of the conversation */
    messages: ChatMessage[]; /*!< An array of messages representing the conversation history */
    temperature: number; /*!< Temperature setting for response variability (0..2) */
    tools?: ToolDefinition[]; /*!< Optional list of tools the model is allowed to call */
    signal?: AbortSignal; /*!< Optional abort signal used to cancel the upstream request */
}

/**
 * @type StreamFrame
 * @description Discriminated union yielded by {@link GoogleAI.stream}. Text frames carry incremental content; tool-call frames carry a complete Gemini function call.
 */
export type StreamFrame = | { kind: 'text'; delta: string } | { kind: 'tool_call'; name: string; arguments: string };

/**
 * @constant GeminiResponseSchema
 * @description Runtime parser for the subset of Gemini generateContent responses we consume (also applied to each streamed chunk).
 */
const GeminiResponseSchema = z.object({
    candidates: z.array(z.object({
        content: z.object({
            parts: z.array(z.object({
                text: z.string().optional(),
                functionCall: z.object({
                    name: z.string(),
                    args: z.record(z.string(), z.unknown()).optional()
                }).optional()
            })).optional()
        }).optional()
    })).optional()
});

/**
 * @function readDecodedStream
 * @description Wraps a Web ReadableStream of bytes and yields its UTF-8 decoded text chunks. Streaming decode handles multi-byte sequences split across chunk boundaries.
 *
 * @param {ReadableStream<Uint8Array>} body The response body stream to decode.
 * @returns {AsyncGenerator<string, void, void>} An async generator yielding decoded text chunks.
 */
async function* readDecodedStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string, void, void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }
            yield decoder.decode(value, { stream: true });
        }
    } finally {
        reader.releaseLock();
    }
}

/**
 * @function parseGeminiSseStream
 * @description Parses an iterable of decoded text chunks containing Gemini SSE frames (alt=sse) and yields each stream frame in order.
 *
 * @param {AsyncIterable<string>} chunks An iterable of UTF-8 decoded text chunks from the SSE response body.
 * @returns {AsyncGenerator<StreamFrame, void, void>} An async generator that yields each frame in order.
 */
export async function* parseGeminiSseStream(chunks: AsyncIterable<string>): AsyncGenerator<StreamFrame, void, void> {
    let buffer = '';

    for await (const chunk of chunks) {
        buffer += chunk;

        let separatorIndex = buffer.indexOf('\n\n');
        while (separatorIndex !== -1) {
            const frame = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);
            separatorIndex = buffer.indexOf('\n\n');

            const dataLine = frame.split('\n').find((line) => line.startsWith('data:'));
            if (!dataLine) {
                continue;
            }

            const payload = dataLine.slice('data:'.length).trim();
            if (payload.length < 1) {
                continue;
            }

            const parsed: unknown = JSON.parse(payload);
            const chunkData = GeminiResponseSchema.parse(parsed);
            const parts = chunkData.candidates?.[0]?.content?.parts;
            if (!parts) {
                continue;
            }

            for (const part of parts) {
                if (typeof part.text === 'string' && part.text.length > 0) {
                    yield { kind: 'text', delta: part.text };
                }
                if (part.functionCall) {
                    yield { kind: 'tool_call', name: part.functionCall.name, arguments: JSON.stringify(part.functionCall.args ?? {}) };
                }
            }
        }
    }
}

/**
 * @function streamGeminiCompletion
 * @description Calls the Gemini streamGenerateContent endpoint and yields each stream frame (text deltas and complete function calls).
 *
 * @param {string} model The Gemini model id (e.g. gemini-2.5-flash).
 * @param {string} apiKey The Google AI Studio API key.
 * @param {StreamChatOptions} options The streaming options provided by the caller.
 * @returns {AsyncGenerator<StreamFrame, void, void>} An async generator that yields each frame in order.
 */
async function* streamGeminiCompletion(model: string, apiKey: string, options: StreamChatOptions): AsyncGenerator<StreamFrame, void, void> {
    if (options.temperature < 0 || options.temperature > 2) {
        throw new Error('Temperature must be between 0 and 2');
    }

    const body: Record<string, unknown> = {
        systemInstruction: { parts: [{ text: options.system }] },
        contents: options.messages.map((message) => ({
            role: message.role,
            parts: [{ text: message.content }]
        })),
        generationConfig: {
            temperature: options.temperature
        }
    };

    if (options.tools && options.tools.length > 0) {
        body.tools = [{ functionDeclarations: options.tools }];
    }

    const response: Response = await fetch(`${GOOGLE_AI_BASE_URL}/models/${model}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(body),
        signal: options.signal
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Google AI stream request failed: ${response.status} ${response.statusText} — ${errorBody}`);
    }

    if (!response.body) {
        throw new Error('Google AI stream response has no body');
    }

    yield* parseGeminiSseStream(readDecodedStream(response.body));
}

/**
 * @interface GoogleAI
 * @description Public interface exposed on the Fastify instance.
 */
export interface GoogleAI {
    chat: <T>(options: ChatOptions) => Promise<T>; /*!< Single-shot JSON-mode completion used by exercise onboarding */
    stream: (options: StreamChatOptions) => AsyncIterable<StreamFrame>; /*!< Frame stream for the freeform assistant with optional function calls */
}

/**
 * @function googleAIPlugin
 * @description Fastify plugin for integrating with Google AI Studio (Gemini).
 */
export default fp(function (fastify: FastifyInstance): void {
    const model = fastify.variables.GOOGLE_AI_MODEL;
    const apiKey = fastify.variables.GOOGLE_AI_API_KEY;

    fastify.decorate('ai', {
        async chat<T>(options: ChatOptions): Promise<T> {
            if (options.temperature < 0 || options.temperature > 2) {
                throw new Error('Temperature must be between 0 and 2');
            }

            const res: Response = await fetch(`${GOOGLE_AI_BASE_URL}/models/${model}:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: `${options.system}\nAlways respond with a single valid JSON object.` }]
                    },
                    contents: options.messages.map((message) => ({
                        role: message.role,
                        parts: [{ text: message.content }]
                    })),
                    generationConfig: {
                        temperature: options.temperature,
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (!res.ok) {
                const errorBody = await res.text();
                throw new Error(`Google AI request failed: ${res.status} ${res.statusText} — ${errorBody}`);
            }

            const data = GeminiResponseSchema.parse(await res.json());
            const text = data.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text;

            if (!text || text.length < 1) {
                throw new Error('Google AI returned an empty response');
            }

            const parsed: unknown = JSON.parse(text);

            return parsed as T;
        },

        stream(options: StreamChatOptions): AsyncIterable<StreamFrame> {
            return streamGeminiCompletion(model, apiKey, options);
        }
    });
}, {
    name: 'ai',
    dependencies: ['environment']
});
