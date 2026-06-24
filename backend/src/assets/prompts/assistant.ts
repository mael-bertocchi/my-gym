import type { Maybe } from 'src/shared/models';

/**
 * @constant COACH_SYSTEM
 * @description System instruction for the conversational coaching assistant.
 */
export const COACH_SYSTEM = 'You are a personal strength and conditioning coach. You advise one athlete, grounded strictly in the training data provided below. Be concise, specific, and practical: reference the athlete\'s own exercises, loads, and trends. If the data is insufficient to answer, say so and suggest what to log. Never invent numbers that are not in the data.';

/**
 * @constant INSIGHTS_SYSTEM
 * @description System instruction for proactive insights (JSON mode).
 */
export const INSIGHTS_SYSTEM = 'You are a personal strength coach reviewing the athlete\'s recent training data below. Surface proactive insights: plateaus on specific lifts, muscle-group imbalances, notable progress, and what to prioritise next session. Base every point strictly on the data. Respond as JSON with a single field "insights": an array of 2-6 short, specific strings.';

/**
 * @interface ContextWorkoutExercise
 * @description One exercise performed in a recent workout, summarised for the prompt.
 */
export interface ContextWorkoutExercise {
    name: string; /*!< The exercise name */
    setCount: number; /*!< Number of sets logged */
    topSet: Maybe<string>; /*!< The heaviest working set, rendered like "100kg x 5" */
}

/**
 * @interface ContextWorkout
 * @description A recent workout summarised for the prompt.
 */
export interface ContextWorkout {
    date: string; /*!< ISO timestamp of the workout */
    gym: Maybe<string>; /*!< The gym name, when recorded */
    exercises: ContextWorkoutExercise[]; /*!< The exercises performed */
}

/**
 * @interface ContextRecord
 * @description An exercise's bests, summarised for the prompt.
 */
export interface ContextRecord {
    name: string; /*!< The exercise name */
    heaviestKg: Maybe<number>; /*!< Heaviest load in kg */
    bestEstimated1RM: Maybe<number>; /*!< Best estimated 1RM in kg */
}

/**
 * @interface ContextMuscle
 * @description Recent working-set credit for one muscle, summarised for the prompt.
 */
export interface ContextMuscle {
    muscle: string; /*!< The muscle group */
    sets: number; /*!< Weighted set credit */
    volume: number; /*!< Weighted volume credit */
}

/**
 * @interface AssistantContext
 * @description The caller's own training data assembled to ground the assistant.
 */
export interface AssistantContext {
    displayName: string; /*!< The athlete's display name */
    recentWorkouts: ContextWorkout[]; /*!< Recent sessions, most recent first */
    personalRecords: ContextRecord[]; /*!< Top lifts by estimated 1RM */
    muscleBalance: ContextMuscle[]; /*!< Recent per-muscle working-set credit */
}

/**
 * @interface AssistantPromptMessage
 * @description One turn passed to the model ('model' is the assistant turn).
 */
export interface AssistantPromptMessage {
    role: 'user' | 'model'; /*!< The turn's author */
    content: string; /*!< The turn's text */
}

/**
 * @interface AssistantPrompt
 * @description A system instruction plus the turns sent to the model.
 */
export interface AssistantPrompt {
    system: string; /*!< System instruction setting the coaching context */
    messages: AssistantPromptMessage[]; /*!< The conversation turns */
}

/**
 * @function formatContext
 * @description Renders the caller's training data into the grounding text shared by chat and insights. All loads are in kilograms.
 *
 * @param {AssistantContext} context The assembled training data.
 * @returns {string} The grounding text block.
 */
export function formatContext(context: AssistantContext): string {
    const lines: string[] = [`Athlete: ${context.displayName}. All loads are in kilograms.`];

    lines.push('', 'Recent workouts:');
    if (context.recentWorkouts.length !== 0) {
        for (const workout of context.recentWorkouts) {
            const where = workout.gym !== null ? ` at ${workout.gym}` : '';
            const exercises = workout.exercises
                .map((exercise) => {
                    const top = exercise.topSet !== null ? ` top ${exercise.topSet}` : '';
                    return `${exercise.name} (${exercise.setCount} sets${top})`;
                })
                .join('; ');
            lines.push(`- ${workout.date}${where}: ${exercises.length !== 0 ? exercises : 'no exercises'}`);
        }
    } else {
        lines.push('- none logged yet');
    }

    lines.push('', 'Personal records (top lifts):');
    if (context.personalRecords.length !== 0) {
        for (const record of context.personalRecords) {
            const heaviest = record.heaviestKg !== null ? `heaviest ${record.heaviestKg}kg` : 'bodyweight';
            const oneRm = record.bestEstimated1RM !== null ? `, est 1RM ${record.bestEstimated1RM}kg` : '';
            lines.push(`- ${record.name}: ${heaviest}${oneRm}`);
        }
    } else {
        lines.push('- none yet');
    }

    lines.push('', 'Recent muscle balance (working-set volume):');
    if (context.muscleBalance.length !== 0) {
        for (const muscle of context.muscleBalance) {
            lines.push(`- ${muscle.muscle}: ${muscle.sets} sets, ${muscle.volume} volume`);
        }
    } else {
        lines.push('- no data yet');
    }

    return lines.join('\n');
}

/**
 * @function buildChatSystem
 * @description Builds the system instruction for a chat turn: the coaching brief plus the grounding context.
 *
 * @param {AssistantContext} context The assembled training data.
 * @returns {string} The full system instruction.
 */
export function buildChatSystem(context: AssistantContext): string {
    return `${COACH_SYSTEM}\n\n${formatContext(context)}`;
}

/**
 * @function buildInsightsPrompt
 * @description Builds the JSON-mode prompt that asks the model for proactive insights from the caller's data.
 *
 * @param {AssistantContext} context The assembled training data.
 * @returns {AssistantPrompt} The system instruction and the single user turn.
 */
export function buildInsightsPrompt(context: AssistantContext): AssistantPrompt {
    return {
        system: `${INSIGHTS_SYSTEM}\n\n${formatContext(context)}`,
        messages: [{ role: 'user', content: 'Review my recent training data and return proactive insights.' }]
    };
}
