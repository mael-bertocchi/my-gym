import type { EquipmentType, MuscleGroup } from 'prisma/generated/prisma/client';
import type { GoogleAI } from 'src/plugins/google-ai';
import { z } from 'zod';

/**
 * @interface VariantContext
 * @description The facts about an exercise variant used to prompt the coaching model.
 */
export interface VariantContext {
    exerciseName: string; /*!< The movement name (e.g. "Chest Press") */
    primaryMuscle: MuscleGroup; /*!< The primary muscle worked */
    secondaryMuscles: MuscleGroup[]; /*!< Any secondary muscles worked */
    equipmentType: EquipmentType; /*!< The equipment used */
    brandName?: string; /*!< The machine manufacturer, when the equipment is a branded machine */
}

/**
 * @interface OnboardingPrompt
 * @description A system instruction plus the user turn sent to the coaching model.
 */
export interface OnboardingPrompt {
    system: string; /*!< System instruction setting the coaching context */
    messages: { role: 'user'; content: string }[]; /*!< The single user turn describing the variant */
}

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
 * @function buildOnboardingPrompt
 * @description Builds the system + user prompt that asks the model for a variant's coaching content.
 *
 * @param {VariantContext} context The variant facts to describe to the model.
 * @returns {OnboardingPrompt} The system instruction and the single user message.
 */
export function buildOnboardingPrompt(context: VariantContext): OnboardingPrompt {
    const system = 'You are an expert strength and conditioning coach. Given an exercise, its equipment, and the muscles it trains, return concise, accurate coaching content. Respond as JSON with exactly three string fields: "formSummary" (2-3 sentences of key form cues), "instructions" (a short numbered list of how to perform the movement), and "equipmentTips" (practical setup advice specific to the equipment).';

    const secondary = context.secondaryMuscles.length !== 0 ? context.secondaryMuscles.join(', ') : 'none';

    let description = `Exercise: ${context.exerciseName}\nEquipment: ${context.equipmentType}\nPrimary muscle: ${context.primaryMuscle}\nSecondary muscles: ${secondary}`;

    if (context.brandName !== undefined) {
        description += `\nMachine brand: ${context.brandName}. Tailor the equipment tips to this manufacturer's machine where relevant.`;
    }

    return {
        system,
        messages: [{ role: 'user', content: description }]
    };
}

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
