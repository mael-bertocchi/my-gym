import type { ReactElement } from 'react';
import { EmptyState, Screen } from '@/components';

/**
 * @function NewExerciseScreen
 * @description Stub for the New Exercise sheet; body wired in a later task.
 *
 * @returns {ReactElement} The placeholder element.
 */
export default function NewExerciseScreen(): ReactElement {
    return <Screen><EmptyState message="New exercise" /></Screen>;
}
