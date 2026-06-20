import type { ReactElement } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, EmptyState, Screen } from '@/components';

/**
 * @function WorkoutModalScreen
 * @description Full-screen-modal placeholder for a workout; reads the workoutId param and offers a close (minimize) back to the tabs.
 *
 * @returns {ReactElement} The workout modal element.
 */
export default function WorkoutModalScreen(): ReactElement {
    const params = useLocalSearchParams<{ workoutId: string }>();
    const router = useRouter();
    const workoutId: string = params.workoutId ?? 'new';
    const footer = <Button label="Close" variant="ghost" onPress={() => { router.back(); }} />;
    return <Screen footer={footer}><EmptyState message={`Workout "${workoutId}" — logging coming soon`} /></Screen>;
}
