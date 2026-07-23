import type { AssistantContext, TargetWorkout } from 'src/assets/prompts/assistant';
import { buildChatSystem, buildWorkoutSummaryPrompt, formatContext } from 'src/assets/prompts/assistant';
import { describe, expect, it } from 'vitest';

const context: AssistantContext = {
    displayName: 'Maël Bertocchi',
    recentWorkouts: [
        { date: '2026-06-18T10:00:00.000Z', gym: 'Iron Temple', exercises: [{ name: 'Chest Press', setCount: 3, topSet: '100kg x 5' }] }
    ],
    personalRecords: [{ name: 'Chest Press', heaviestKg: 100, bestEstimated1RM: 116.7 }],
    muscleBalance: [{ muscle: 'CHEST', sets: 6, volume: 3000 }]
};

const target: TargetWorkout = {
    name: 'Push day',
    date: '2026-07-18T18:00:00.000Z',
    gym: 'Iron Temple',
    durationMinutes: 58,
    difficultyRating: 7,
    enjoymentRating: 4,
    exercises: [
        { name: 'Chest Press', sets: [{ setType: 'WARMUP', weightKg: 40, reps: 12 }, { setType: 'NORMAL', weightKg: 62.5, reps: 10 }] }
    ]
};

describe('formatContext', () => {
    it('includes the athlete, recent workout, personal record, and muscle data', () => {
        const text = formatContext(context);
        expect(text).toContain('Maël Bertocchi');
        expect(text).toContain('Chest Press');
        expect(text).toContain('Iron Temple');
        expect(text).toContain('CHEST');
    });

    it('notes when there is no logged data', () => {
        const text = formatContext({ displayName: 'Maël Bertocchi', recentWorkouts: [], personalRecords: [], muscleBalance: [] });
        expect(text.toLowerCase()).toContain('none logged yet');
    });
});

describe('buildChatSystem', () => {
    it('prepends the coaching brief to the grounding context', () => {
        const system = buildChatSystem(context);
        expect(system.length).toBeGreaterThan(0);
        expect(system).toContain('Maël Bertocchi');
    });
});

describe('buildWorkoutSummaryPrompt', () => {
    it('grounds the prompt in the target workout and the recent-training context', () => {
        const prompt = buildWorkoutSummaryPrompt(context, target);
        expect(prompt.messages).toHaveLength(1);
        expect(prompt.messages[0].role).toBe('user');
        expect(prompt.system).toContain('Push day');
        expect(prompt.system).toContain('Chest Press');
        expect(prompt.system).toContain('Maël Bertocchi');
    });

    it('notes when the workout has no logged exercises', () => {
        const prompt = buildWorkoutSummaryPrompt(context, { ...target, exercises: [] });
        expect(prompt.system.toLowerCase()).toContain('no exercises logged');
    });
});
