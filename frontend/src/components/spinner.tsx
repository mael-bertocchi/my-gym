import { ActivityIndicator } from 'react-native';
import type { ReactElement } from 'react';
import { theme } from '@/theme/theme';

/**
 * @interface SpinnerProps
 * @description Props for the loading `Spinner` primitive.
 */
export interface SpinnerProps {
    size?: 'small' | 'large'; /*!< Indicator size; defaults to `small` */
    color?: string; /*!< Indicator color; defaults to the accent */
}

/**
 * @function Spinner
 * @description Renders a platform activity indicator tinted to the accent by default.
 *
 * @param {SpinnerProps} props The spinner props.
 * @returns {ReactElement} The spinner element.
 */
export function Spinner(props: SpinnerProps): ReactElement {
    return <ActivityIndicator size={props.size ?? 'small'} color={props.color ?? theme.color.accent} />;
}
