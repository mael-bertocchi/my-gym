import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { Maybe } from 'src/shared/models';
import { z } from 'zod';

/**
 * @type ChatMessageRole
 * @description Allowed roles for a single message in a chat conversation
 */
type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * @interface ChatToolCall
 * @description A single tool call emitted by the model, as it appears on an assistant message in the request payload.
 */
export interface ChatToolCall {
    id: string; /*!< The tool call identifier returned by the model */
    type: 'function'; /*!< Tool call kind (only function calls supported by the Azure AI Foundry chat API) */
    function: {
        name: string; /*!< The tool function name */
        arguments: string; /*!< JSON-encoded argument object */
    };
}

/**
 * @interface ChatMessage
 * @description A single message in a chat conversation. Tool messages carry a `tool_call_id`; assistant messages may carry `tool_calls`.
 */
interface ChatMessage {
    role: ChatMessageRole; /*!< The role of the message sender */
    content: Maybe<string>; /*!< The content of the message; assistant tool-call turns carry an empty string */
    tool_call_id?: string; /*!< When role is `tool`, the id of the assistant tool call this message answers */
    tool_calls?: ChatToolCall[]; /*!< When role is `assistant`, the tool calls produced in this turn */
}

/**
 * @interface ChatOptions
 * @description Options for a JSON-mode chat completion request
 */
interface ChatOptions {
    system: string; /*!< Instructions for the AI to set the context of the conversation */
    messages: ChatMessage[]; /*!< An array of messages representing the conversation history */
    temperature: number; /*!< Temperature setting for response variability (0..2) */
}

/**
 * @interface ToolDefinition
 * @description An OpenAI/Azure-compatible tool definition advertised to the model.
 */
export interface ToolDefinition {
    type: 'function'; /*!< Only function tools are supported */
    function: {
        name: string; /*!< Function name (snake_case) */
        description: string; /*!< Function description used by the model when deciding whether to call it */
        parameters: Record<string, unknown>; /*!< JSON Schema for the function's arguments */
    };
}

/**
 * @interface StreamChatOptions
 * @description Options for a streaming, freeform chat completion request
 */
export interface StreamChatOptions {
    system: string; /*!< Instructions for the AI to set the context of the conversation */
    messages: ChatMessage[]; /*!< An array of messages representing the conversation history */
    temperature: number; /*!< Temperature setting for response variability (0..2) */
    tools?: ToolDefinition[]; /*!< Optional list of tools the model is allowed to call */
    signal?: AbortSignal; /*!< Optional abort signal used to cancel the upstream request */
}

/**
 * @type StreamFrame
 * @description Discriminated union yielded by {@link AzureAI.stream}. Text frames carry incremental content; tool-call frames are emitted once the model finishes streaming the arguments for a single tool call.
 */
export type StreamFrame = | { kind: 'text'; delta: string } | { kind: 'tool_call'; id: string; name: string; arguments: string };

/**
 * @constant AzureAIChatResponseSchema
 * @description Runtime parser for the subset of Azure AI Foundry chat-completion responses we actually consume.
 */
const AzureAIChatResponseSchema = z.object({
    choices: z.array(z.object({
        message: z.object({
            content: z.string()
        })
    })).min(1)
});

/**
 * @constant AzureAIStreamChunkSchema
 * @description Runtime parser for an individual Server-Sent Event chunk produced by Azure AI Foundry streaming completions.
 */
const AzureAIStreamChunkSchema = z.object({
    choices: z.array(z.object({
        delta: z.object({
            content: z.string().nullable().optional(),
            tool_calls: z.array(z.object({
                index: z.number(),
                id: z.string().optional(),
                type: z.string().optional(),
                function: z.object({
                    name: z.string().optional(),
                    arguments: z.string().optional()
                }).optional()
            })).optional()
        }).optional(),
        finish_reason: z.string().nullable().optional()
    }))
});

/**
 * @interface ToolCallAccumulator
 * @description Mutable buffer used to assemble a single tool call as Azure streams its arguments incrementally.
 */
interface ToolCallAccumulator {
    id: string; /*!< Tool call identifier (set by the first delta) */
    name: string; /*!< Function name (set by the first delta) */
    arguments: string; /*!< Concatenated argument JSON, built up across deltas */
}

/**
 * @function parseStreamChunk
 * @description Parses a single Azure AI Foundry SSE payload and emits any frames it produces. Tool-call deltas are accumulated across calls via the supplied buffer; complete tool calls are yielded when the stream advances past them.
 *
 * @param {string} payload The raw JSON payload from a `data:` SSE line (with the `data:` prefix stripped).
 * @param {Map<number, ToolCallAccumulator>} buffer Per-stream buffer keyed by tool-call index, mutated in place.
 * @returns {StreamFrame[]} Zero or more frames produced by this payload.
 */
function parseStreamChunk(payload: string, buffer: Map<number, ToolCallAccumulator>): StreamFrame[] {
    const parsed: unknown = JSON.parse(payload);
    const chunk = AzureAIStreamChunkSchema.parse(parsed);
    const choice = chunk.choices[0];
    if (!choice) {
        return [];
    }

    const frames: StreamFrame[] = [];

    const content = choice.delta?.content;
    if (typeof content === 'string' && content.length > 0) {
        frames.push({ kind: 'text', delta: content });
    }

    const toolDeltas = choice.delta?.tool_calls;
    if (toolDeltas) {
        for (const td of toolDeltas) {
            let entry = buffer.get(td.index);
            if (!entry) {
                entry = { id: '', name: '', arguments: '' };
                buffer.set(td.index, entry);
            }
            if (td.id) {
                entry.id = td.id;
            }
            if (td.function?.name) {
                entry.name = td.function.name;
            }
            if (typeof td.function?.arguments === 'string') {
                entry.arguments += td.function.arguments;
            }
        }
    }

    if (choice.finish_reason === 'tool_calls') {
        const indices = Array.from(buffer.keys()).sort((a: number, b: number): number => a - b);
        for (const index of indices) {
            const entry = buffer.get(index);
            if (entry && entry.id.length > 0 && entry.name.length > 0) {
                frames.push({ kind: 'tool_call', id: entry.id, name: entry.name, arguments: entry.arguments });
            }
        }
        buffer.clear();
    }

    return frames;
}

/**
 * @function parseSseTextStream
 * @description Parses an iterable of decoded text chunks containing Azure AI Foundry SSE frames and yields each stream frame. Terminates on the `[DONE]` sentinel.
 *
 * @param {AsyncIterable<string>} chunks An iterable of UTF-8 decoded text chunks from the SSE response body.
 * @returns {AsyncGenerator<StreamFrame, void, void>} An async generator that yields each frame in order.
 */
export async function* parseSseTextStream(chunks: AsyncIterable<string>): AsyncGenerator<StreamFrame, void, void> {
    let buffer = '';
    const toolBuffer = new Map<number, ToolCallAccumulator>();

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
            if (payload === '[DONE]') {
                return;
            }

            for (const out of parseStreamChunk(payload, toolBuffer)) {
                yield out;
            }
        }
    }
}

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
 * @function streamAzureCompletion
 * @description Calls the Azure AI Foundry streaming completions endpoint and yields each stream frame (text deltas and complete tool calls).
 *
 * @param {string} endpoint The Azure AI Foundry chat completions endpoint URL.
 * @param {string} apiKey The Azure AI Foundry API key.
 * @param {StreamChatOptions} options The streaming chat options provided by the caller.
 * @returns {AsyncGenerator<StreamFrame, void, void>} An async generator that yields each frame in order.
 */
async function* streamAzureCompletion(endpoint: string, apiKey: string, options: StreamChatOptions): AsyncGenerator<StreamFrame, void, void> {
    if (options.temperature < 0 || options.temperature > 2) {
        throw new Error('Temperature must be between 0 and 2');
    }

    const body: Record<string, unknown> = {
        temperature: options.temperature,
        stream: true,
        messages: [
            { role: 'system', content: options.system },
            ...options.messages
        ]
    };

    if (options.tools && options.tools.length > 0) {
        body.tools = options.tools;
        body.tool_choice = 'auto';
    }

    const response: Response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
            Accept: 'text/event-stream'
        },
        body: JSON.stringify(body),
        signal: options.signal
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Azure AI stream request failed: ${response.status} ${response.statusText} — ${errorBody}`);
    }

    if (!response.body) {
        throw new Error('Azure AI stream response has no body');
    }

    yield* parseSseTextStream(readDecodedStream(response.body));
}

/**
 * @interface AzureAI
 * @description Public interface exposed on the Fastify instance
 */
export interface AzureAI {
    chat: <T>(options: ChatOptions) => Promise<T>; /*!< Single-shot JSON-mode completion used by exercise onboarding */
    stream: (options: StreamChatOptions) => AsyncIterable<StreamFrame>; /*!< Frame stream for the freeform assistant with optional tool calls */
}

/**
 * @function azureAIPlugin
 * @description Fastify plugin for integrating with Azure AI Foundry
 */
export default fp(function (fastify: FastifyInstance): void {
    fastify.decorate('ai', {
        async chat<T>(options: ChatOptions): Promise<T> {
            if (options.temperature >= 0 && options.temperature <= 2) {
                const res: Response = await fetch(`${fastify.variables.AZURE_AI_ENDPOINT}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': fastify.variables.AZURE_AI_API_KEY
                    },
                    body: JSON.stringify({
                        temperature: options.temperature,
                        response_format: {
                            type: 'json_object'
                        },
                        messages: [
                            {
                                role: 'system',
                                content: `${options.system}\nAlways respond in JSON format. Always include a summary field with a brief, friendly remark about the request.`
                            },
                            ...options.messages
                        ]
                    })
                });

                if (!res.ok) {
                    const errorBody = await res.text();
                    throw new Error(`Azure AI request failed: ${res.status} ${res.statusText} — ${errorBody}`);
                }

                const data = AzureAIChatResponseSchema.parse(await res.json());
                const content = data.choices[0].message.content;

                if (content.length < 1) {
                    throw new Error('Azure AI returned an empty response');
                }

                const parsed: unknown = JSON.parse(content);

                return parsed as T;
            }
            throw new Error('Temperature must be between 0 and 2');
        },

        stream(options: StreamChatOptions): AsyncIterable<StreamFrame> {
            return streamAzureCompletion(fastify.variables.AZURE_AI_ENDPOINT, fastify.variables.AZURE_AI_API_KEY, options);
        }
    });
}, {
    name: 'ai',
    dependencies: ['environment']
});

export { parseStreamChunk };
