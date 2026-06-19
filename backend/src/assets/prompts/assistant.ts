import type { Maybe } from 'src/shared/models';

/**
 * @interface AdviceSet
 * @description One working set's numbers used in the advice prompt (weights already converted from Decimal).
 */
export interface AdviceSet {
    weightKg: Maybe<number>; /*!< External load in kg, or null for bodyweight */
    reps: Maybe<number>; /*!< Reps performed */
    rpe: Maybe<number>; /*!< Rate of perceived exertion (0-10) */
}

/**
 * @interface AdviceSession
 * @description One past session's working sets for a variant.
 */
export interface AdviceSession {
    date: string; /*!< ISO timestamp of when the session started */
    sets: AdviceSet[]; /*!< The working sets logged for the variant in that session */
}

/**
 * @interface AssistantContext
 * @description The facts about a variant and its recent history used to prompt the coaching model.
 */
export interface AssistantContext {
    exerciseName: string; /*!< The movement name */
    equipmentType: string; /*!< The equipment used */
    brandName?: string; /*!< The machine manufacturer, when relevant */
    sessions: AdviceSession[]; /*!< Recent sessions, most recent first */
}

/**
 * @interface AssistantPrompt
 * @description A system instruction plus the user turn sent to the coaching model.
 */
export interface AssistantPrompt {
    system: string; /*!< System instruction setting the coaching context */
    messages: { role: 'user'; content: string }[]; /*!< The single user turn describing the history */
}

/**
 * @function formatSet
 * @description Renders one working set as a short human-readable string.
 *
 * @param {AdviceSet} set The set to render.
 * @returns {string} A compact description like "100kg x 5 @RPE8" or "bodyweight x 10".
 */
function formatSet(set: AdviceSet): string {
    const load = set.weightKg !== null ? `${set.weightKg}kg` : 'bodyweight';
    const reps = set.reps !== null ? ` x ${set.reps}` : '';
    const rpe = set.rpe !== null ? ` @RPE${set.rpe}` : '';

    return `${load}${reps}${rpe}`;
}

/**
 * @function buildAssistantPrompt
 * @description Builds the system + user prompt asking the model for progressive-overload advice from a variant's history.
 *
 * @param {AssistantContext} context The variant facts and recent session history.
 * @returns {AssistantPrompt} The system instruction and the single user message.
 */
export function buildAssistantPrompt(context: AssistantContext): AssistantPrompt {
    const system = 'You are an expert strength coach focused on progressive overload. Given an exercise and its recent working-set history (most recent session first), give concise, specific, actionable advice for the next session: what weight and reps to target and why. Reply in 3-5 sentences with no preamble.';

    const brand = context.brandName !== undefined ? ` (${context.brandName})` : '';
    let description = `Exercise: ${context.exerciseName} on ${context.equipmentType}${brand}.`;

    if (context.sessions.length !== 0) {
        description += '\nRecent working sets (most recent first):';
        for (const session of context.sessions) {
            const sets = session.sets.length !== 0 ? session.sets.map(formatSet).join(', ') : 'no working sets';
            description += `\n- ${session.date}: ${sets}`;
        }
    } else {
        description += '\nThere is no logged history yet. Suggest a sensible starting point and how to progress.';
    }

    return {
        system,
        messages: [{ role: 'user', content: description }]
    };
}
