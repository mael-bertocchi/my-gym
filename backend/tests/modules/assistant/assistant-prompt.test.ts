import { buildAssistantPrompt } from 'src/assets/prompts/assistant';
import { describe, expect, it } from 'vitest';

describe('buildAssistantPrompt', () => {
    it('includes the exercise and a session set in the user message', () => {
        const prompt = buildAssistantPrompt({
            exerciseName: 'Chest Press',
            equipmentType: 'MACHINE',
            brandName: 'Matrix',
            sessions: [{ date: '2026-06-18T10:00:00.000Z', sets: [{ weightKg: 100, reps: 8, rpe: 8 }] }]
        });
        expect(prompt.messages).toHaveLength(1);
        expect(prompt.messages[0].content).toContain('Chest Press');
        expect(prompt.messages[0].content).toContain('Matrix');
        expect(prompt.messages[0].content).toContain('100kg');
        expect(prompt.system.length).toBeGreaterThan(0);
    });

    it('renders bodyweight when a set has no weight', () => {
        const prompt = buildAssistantPrompt({
            exerciseName: 'Pull Up',
            equipmentType: 'BODYWEIGHT',
            sessions: [{ date: '2026-06-18T10:00:00.000Z', sets: [{ weightKg: null, reps: 10, rpe: null }] }]
        });
        expect(prompt.messages[0].content).toContain('bodyweight');
    });

    it('states there is no history when sessions are empty', () => {
        const prompt = buildAssistantPrompt({ exerciseName: 'Squat', equipmentType: 'BARBELL', sessions: [] });
        expect(prompt.messages[0].content.toLowerCase()).toContain('no logged history');
    });
});
