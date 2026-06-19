import type { PrismaClient } from 'prisma/generated/prisma/client';
import type { AssistantContext } from 'src/assets/prompts/assistant';
import { buildAssistantPrompt } from 'src/assets/prompts/assistant';
import type { GoogleAI } from 'src/plugins/google-ai';
import type { Maybe } from 'src/shared/models';

/**
 * @function loadAdviceContext
 * @description Loads a variant (scoped to the user) and its recent working-set history into an AssistantContext. Returns null when the variant is not the user's.
 *
 * @param {PrismaClient} prisma The Prisma client.
 * @param {string} userId The owning user's id.
 * @param {string} variantId The exercise variant id.
 * @returns {Promise<Maybe<AssistantContext>>} The context, or null when the variant is not found/owned.
 */
export async function loadAdviceContext(prisma: PrismaClient, userId: string, variantId: string): Promise<Maybe<AssistantContext>> {
    const variant = await prisma.exerciseVariant.findFirst({
        where: { id: variantId, exercise: { userId } },
        select: {
            equipmentType: true,
            exercise: { select: { name: true } },
            machineBrand: { select: { name: true } }
        }
    });

    if (variant === null) {
        return null;
    }

    const entries = await prisma.workoutExercise.findMany({
        where: { exerciseVariantId: variantId, workout: { userId } },
        select: {
            workout: { select: { startedAt: true } },
            sets: {
                where: { setType: 'WORKING' },
                orderBy: { setNumber: 'asc' },
                select: { weightKg: true, reps: true, rpe: true }
            }
        },
        orderBy: { workout: { startedAt: 'desc' } },
        take: 10
    });

    const sessions = entries.map((entry) => ({
        date: entry.workout.startedAt.toISOString(),
        sets: entry.sets.map((set) => ({
            weightKg: set.weightKg !== null ? set.weightKg.toNumber() : null,
            reps: set.reps,
            rpe: set.rpe !== null ? set.rpe.toNumber() : null
        }))
    }));

    return {
        exerciseName: variant.exercise.name,
        equipmentType: variant.equipmentType,
        brandName: variant.machineBrand?.name,
        sessions
    };
}

/**
 * @function generateAdvice
 * @description Builds the advice prompt and collects the streamed model reply into a single string.
 *
 * @param {GoogleAI} ai The Gemini client decorated on the Fastify instance.
 * @param {AssistantContext} context The variant facts and recent history.
 * @returns {Promise<string>} The full advice text.
 */
export async function generateAdvice(ai: GoogleAI, context: AssistantContext): Promise<string> {
    const prompt = buildAssistantPrompt(context);

    let advice = '';
    for await (const delta of ai.stream({ system: prompt.system, messages: prompt.messages, temperature: 0.5 })) {
        advice += delta;
    }

    return advice;
}
