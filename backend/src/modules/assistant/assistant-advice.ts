import type { AssistantContext, AssistantPromptMessage, TargetWorkout } from 'src/assets/prompts/assistant';
import { buildChatSystem, buildWorkoutSummaryPrompt } from 'src/assets/prompts/assistant';
import type { GoogleAI } from 'src/plugins/google-ai';

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
 * @function generateWorkoutSummary
 * @description Streams the assistant's recap and advice for one completed workout, grounded in that workout plus the caller's recent training, and collects it into a single string.
 *
 * @param {GoogleAI} ai The Gemini client decorated on the Fastify instance.
 * @param {AssistantContext} context The caller's training context, for comparison.
 * @param {TargetWorkout} target The workout being reviewed.
 * @returns {Promise<string>} The full summary text.
 */
export async function generateWorkoutSummary(ai: GoogleAI, context: AssistantContext, target: TargetWorkout): Promise<string> {
    const prompt = buildWorkoutSummaryPrompt(context, target);

    let summary = '';
    for await (const delta of ai.stream({ system: prompt.system, messages: prompt.messages, temperature: 0.5 })) {
        summary += delta;
    }

    return summary;
}
