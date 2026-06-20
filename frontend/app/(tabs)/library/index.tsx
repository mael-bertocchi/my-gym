import type { ReactElement } from 'react';
import { EmptyState, Screen } from '@/components';

/**
 * @function LibraryScreen
 * @description Placeholder Library index: empty state until the exercise library is wired.
 *
 * @returns {ReactElement} The Library screen element.
 */
export default function LibraryScreen(): ReactElement {
    return <Screen><EmptyState message="Your exercise library" /></Screen>;
}
