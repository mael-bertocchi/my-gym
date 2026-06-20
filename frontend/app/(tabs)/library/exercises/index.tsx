import type { ReactElement } from 'react';
import { EmptyState, Screen } from '@/components';

/**
 * @function ExercisesScreen
 * @description Placeholder nested exercises index so the Library section is walkable; empty state until exercises are wired.
 *
 * @returns {ReactElement} The exercises screen element.
 */
export default function ExercisesScreen(): ReactElement {
    return <Screen><EmptyState message="No exercises yet" /></Screen>;
}
