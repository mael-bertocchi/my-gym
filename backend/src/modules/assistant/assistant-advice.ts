import type { AssistantContext, AssistantPromptMessage } from 'src/assets/prompts/assistant';
import { buildChatSystem, buildInsightsPrompt } from 'src/assets/prompts/assistant';
import type { GoogleAI } from 'src/plugins/google-ai';
import { z } from 'zod';

/**
 * @constant InsightsResultSchema
 * @description Runtime parser for the proactive-insights JSON the model must return.
 */
const InsightsResultSchema = z.object({
    insights: z.array(z.string())
});

/**
 * @function generateReply
 * @description Streams the assistant's reply to a conversation, grounded in the caller's training context, and collects it into a single string.
 *
 * @param {GoogleAI} ai The Gemini client decorated on the Fastify instance.
 * @param {AssistantContext} context The caller's training context.
 * @param {AssistantPromptMessage[]} history The conversation so far, oldest first.
 * @returns {Promise<string>} The full reply text.
 */
export async function generateReply(ai: GoogleAI, context: AssistantContext, history: AssistantPromptMessage[]): Promise<string> {
    const system = buildChatSystem(context);

    let reply = '';
    for await (const delta of ai.stream({ system, messages: history, temperature: 0.5 })) {
        reply += delta;
    }

    return reply;
}

/**
 * @function generateInsights
 * @description Asks the model for proactive insights from the caller's training context and validates the JSON reply.
 *
 * @param {GoogleAI} ai The Gemini client decorated on the Fastify instance.
 * @param {AssistantContext} context The caller's training context.
 * @returns {Promise<string[]>} The validated list of insight strings.
 */
export async function generateInsights(ai: GoogleAI, context: AssistantContext): Promise<string[]> {
    const prompt = buildInsightsPrompt(context);
    const raw = await ai.chat<unknown>({ system: prompt.system, messages: prompt.messages, temperature: 0.4 });

    return InsightsResultSchema.parse(raw).insights;
}
