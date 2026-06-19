import { buildOnboardingPrompt } from 'src/assets/prompts/onboarding';
import { OnboardingResultSchema } from 'src/modules/exercise-variants/exercise-variants-onboarding';
import { describe, expect, it } from 'vitest';

describe('buildOnboardingPrompt', () => {
    it('mentions the exercise, equipment, and brand in the user message', () => {
        const prompt = buildOnboardingPrompt({
            exerciseName: 'Chest Press',
            primaryMuscle: 'CHEST',
            secondaryMuscles: ['TRICEPS'],
            equipmentType: 'MACHINE',
            brandName: 'Matrix'
        });
        expect(prompt.messages).toHaveLength(1);
        expect(prompt.messages[0].role).toBe('user');
        expect(prompt.messages[0].content).toContain('Chest Press');
        expect(prompt.messages[0].content).toContain('MACHINE');
        expect(prompt.messages[0].content).toContain('Matrix');
        expect(prompt.system.length).toBeGreaterThan(0);
    });

    it('omits brand wording when no brand is given', () => {
        const prompt = buildOnboardingPrompt({
            exerciseName: 'Back Squat',
            primaryMuscle: 'QUADRICEPS',
            secondaryMuscles: [],
            equipmentType: 'BARBELL'
        });
        expect(prompt.messages[0].content).toContain('Back Squat');
        expect(prompt.messages[0].content).not.toContain('brand');
    });
});

describe('OnboardingResultSchema', () => {
    it('accepts the three coaching fields', () => {
        const result = OnboardingResultSchema.safeParse({
            formSummary: 'Keep your shoulder blades retracted.',
            instructions: 'Sit, grip, press, control the eccentric.',
            equipmentTips: 'Set the seat so the handles align with mid-chest.'
        });
        expect(result.success).toBe(true);
    });

    it('rejects a response missing fields', () => {
        expect(OnboardingResultSchema.safeParse({ formSummary: 'x' }).success).toBe(false);
    });
});
