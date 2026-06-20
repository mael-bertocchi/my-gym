import { ScrollView, StyleSheet, View } from 'react-native';
import type { ReactElement, ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner } from '@/components/spinner';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { theme } from '@/theme/theme';

/**
 * @type ScreenStatus
 * @description Lifecycle status driving which body the `Screen` renders.
 */
export type ScreenStatus = 'ready' | 'loading' | 'error' | 'empty';

/**
 * @interface ScreenProps
 * @description Props for the `Screen` safe-area root that every screen mounts.
 */
export interface ScreenProps {
    children: ReactNode; /*!< Screen body content rendered when status is `ready` */
    footer?: ReactNode; /*!< Optional bottom-anchored primary-action slot */
    scroll?: boolean; /*!< Wraps the body in a `ScrollView` when true */
    status?: ScreenStatus; /*!< Lifecycle status; defaults to `ready` */
    onRetry?: () => void; /*!< Retry handler forwarded to the error body */
    errorMessage?: string; /*!< Message shown in the error body */
    emptyMessage?: string; /*!< Message shown in the empty body */
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.color.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1 },
    scrollContent: { padding: theme.spacing.lg16 },
    footer: { paddingHorizontal: theme.spacing.lg16 }
});

/**
 * @function Screen
 * @description Renders the safe-area screen root: status-driven body (loading, error, empty, ready) and an optional thumb-arc footer slot.
 *
 * @param {ScreenProps} props The screen props.
 * @returns {ReactElement} The screen element.
 */
export function Screen(props: ScreenProps): ReactElement {
    const insets = useSafeAreaInsets();
    const status: ScreenStatus = props.status ?? 'ready';

    let body: ReactNode;

    if (status !== 'ready') {
        if (status === 'loading') {
            body = <View style={styles.centered}><Spinner size="large" /></View>;
        } else if (status === 'error') {
            body = <ErrorState message={props.errorMessage ?? 'Something went wrong'} onRetry={props.onRetry} />;
        } else {
            body = <EmptyState message={props.emptyMessage ?? 'Nothing here yet'} />;
        }
    } else if (props.scroll === true) {
        body = <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>{props.children}</ScrollView>;
    } else {
        body = <View style={[styles.body, styles.scrollContent]}>{props.children}</View>;
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {body}
            {props.footer !== undefined ? <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.md12 }]}>{props.footer}</View> : null}
        </View>
    );
}
