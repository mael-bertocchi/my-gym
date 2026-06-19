import { buildOnboardingPrompt } from 'src/assets/prompts/onboarding';
import type { VariantContext } from 'src/assets/prompts/onboarding';
import type { GoogleAI } from 'src/plugins/google-ai';
import { z } from 'zod';

/**
 * @constant OnboardingResultSchema
 * @description Runtime parser for the coaching content the model must return.
 */
export const OnboardingResultSchema = z.object({
    formSummary: z.string().min(1),
    instructions: z.string().min(1),
    equipmentTips: z.string().min(1)
});

/**
 * @type OnboardingResult
 * @description The validated coaching content for a variant.
 */
export type OnboardingResult = z.infer<typeof OnboardingResultSchema>;

/**
 * @function generateVariantContent
 * @description Calls the coaching model and validates its JSON reply into coaching content.
 *
 * @param {GoogleAI} ai The Gemini client decorated on the Fastify instance.
 * @param {VariantContext} context The variant facts to describe to the model.
 * @returns {Promise<OnboardingResult>} The validated coaching content.
 */
export async function generateVariantContent(ai: GoogleAI, context: VariantContext): Promise<OnboardingResult> {
    const prompt = buildOnboardingPrompt(context);
    const raw = await ai.chat<unknown>({ system: prompt.system, messages: prompt.messages, temperature: 0.4 });

    return OnboardingResultSchema.parse(raw);
}
