import type { ReactElement } from 'react';
import { EmptyState, Screen } from '@/components';

/**
 * @function HistoryScreen
 * @description Placeholder History index: empty state until the workout list is wired.
 *
 * @returns {ReactElement} The History screen element.
 */
export default function HistoryScreen(): ReactElement {
    return <Screen><EmptyState message="No workouts yet" /></Screen>;
}
