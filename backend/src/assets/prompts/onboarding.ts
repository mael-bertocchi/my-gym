import type { EquipmentType, MuscleGroup } from 'prisma/generated/prisma/client';

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
