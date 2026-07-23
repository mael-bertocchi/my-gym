import type { Maybe } from 'src/shared/models';

/**
 * @constant COACH_SYSTEM
 * @description System instruction for the conversational coaching assistant.
 */
export const COACH_SYSTEM = 'You are a personal strength and conditioning coach. You advise one athlete, grounded strictly in the training data provided below. Be concise, specific, and practical: reference the athlete\'s own exercises, loads, and trends. If the data is insufficient to answer, say so and suggest what to log. Never invent numbers that are not in the data.';

/**
 * @constant WORKOUT_SUMMARY_SYSTEM
 * @description System instruction for reviewing a single completed workout.
 */
export const WORKOUT_SUMMARY_SYSTEM = 'You are a personal strength and conditioning coach. Review one completed workout for the athlete and write a short recap with concrete advice for their next session: what stood out (progress, effort, imbalance), grounded strictly in the workout below and the athlete\'s recent training for comparison. 2-4 short sentences, practical and specific, no generic filler. Never invent numbers that are not in the data.';

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
 * @interface TargetWorkoutSet
 * @description One logged set within the workout being reviewed.
 */
export interface TargetWorkoutSet {
    setType: string; /*!< WARMUP, NORMAL, DROP, or FAILURE */
    weightKg: Maybe<number>; /*!< Load in kg, null for bodyweight-only sets */
    reps: Maybe<number>; /*!< Reps performed */
}

/**
 * @interface TargetWorkoutExercise
 * @description One exercise performed in the workout being reviewed, with every set.
 */
export interface TargetWorkoutExercise {
    name: string; /*!< The exercise name */
    sets: TargetWorkoutSet[]; /*!< Every logged set, in order */
}

/**
 * @interface TargetWorkout
 * @description The single completed workout being reviewed, in full per-set detail.
 */
export interface TargetWorkout {
    name: Maybe<string>; /*!< The workout's name, when set */
    date: string; /*!< ISO timestamp the workout started */
    gym: Maybe<string>; /*!< The gym name, when recorded */
    durationMinutes: Maybe<number>; /*!< Session length in minutes, when finished */
    difficultyRating: Maybe<number>; /*!< Self-rated difficulty, 1-10 */
    enjoymentRating: Maybe<number>; /*!< Self-rated enjoyment, 1-5 */
    exercises: TargetWorkoutExercise[]; /*!< Every exercise performed, in order */
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
 * @description Renders the caller's training data into the grounding text shared by chat and the workout-summary prompt. All loads are in kilograms.
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
 * @function formatTargetWorkout
 * @description Renders the workout being reviewed into the grounding text for the summary prompt. All loads are in kilograms.
 *
 * @param {TargetWorkout} target The workout being reviewed.
 * @returns {string} The grounding text block.
 */
export function formatTargetWorkout(target: TargetWorkout): string {
    const where = target.gym !== null ? ` at ${target.gym}` : '';
    const duration = target.durationMinutes !== null ? ` (${target.durationMinutes} min)` : '';
    const ratings: string[] = [];
    if (target.difficultyRating !== null) {
        ratings.push(`difficulty ${target.difficultyRating}/10`);
    }
    if (target.enjoymentRating !== null) {
        ratings.push(`enjoyment ${target.enjoymentRating}/5`);
    }
    const ratingsLine = ratings.length !== 0 ? ` Self-rated: ${ratings.join(', ')}.` : '';

    const lines: string[] = [
        `Workout to review: "${target.name ?? 'Workout'}" on ${target.date}${where}${duration}.${ratingsLine}`,
        ''
    ];

    if (target.exercises.length !== 0) {
        for (const exercise of target.exercises) {
            const sets = exercise.sets
                .map((set) => {
                    const type = set.setType !== 'NORMAL' ? `${set.setType.toLowerCase()} ` : '';
                    const weight = set.weightKg !== null ? `${set.weightKg}kg` : 'bodyweight';
                    return `${type}${weight} x${set.reps ?? 0}`;
                })
                .join('; ');
            lines.push(`- ${exercise.name}: ${sets.length !== 0 ? sets : 'no sets logged'}`);
        }
    } else {
        lines.push('- no exercises logged');
    }

    return lines.join('\n');
}

/**
 * @function buildWorkoutSummaryPrompt
 * @description Builds the prompt asking the model to review one completed workout, grounded in that workout plus the athlete's recent training for comparison.
 *
 * @param {AssistantContext} context The athlete's recent training, for comparison.
 * @param {TargetWorkout} target The workout being reviewed.
 * @returns {AssistantPrompt} The system instruction and the single user turn.
 */
export function buildWorkoutSummaryPrompt(context: AssistantContext, target: TargetWorkout): AssistantPrompt {
    return {
        system: `${WORKOUT_SUMMARY_SYSTEM}\n\n${formatTargetWorkout(target)}\n\nFor comparison, the athlete's recent training:\n${formatContext(context)}`,
        messages: [{ role: 'user', content: 'Review this workout and give me your advice.' }]
    };
}
