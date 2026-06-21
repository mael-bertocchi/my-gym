import { StyleSheet } from 'react-native';
import type { ReactElement } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, ListItem, Screen } from '@/components';
import { theme } from '@/theme/theme';

const styles = StyleSheet.create({
    group: { borderRadius: theme.radius.card16, overflow: 'hidden', padding: 0 },
    chevron: { marginLeft: theme.spacing.sm8 }
});

/**
 * @function Chevron
 * @description A trailing chevron accessory for a navigable row.
 *
 * @returns {ReactElement} The chevron element.
 */
function Chevron(): ReactElement {
    return <Ionicons name="chevron-forward" size={18} color={theme.color.textTertiary} style={styles.chevron} />;
}

/**
 * @function LibraryScreen
 * @description The Library hub: navigable Exercises and Brands rows. Gym locations and Profile are out of scope this phase (they live under Settings).
 *
 * @returns {ReactElement} The Library hub element.
 */
export default function LibraryScreen(): ReactElement {
    return (
        <Screen scroll>
            <Card style={styles.group}>
                <ListItem title="Exercises" subtitle="Movements and variants" trailing={<Chevron />} onPress={() => { router.push('/library/exercises'); }} />
                <ListItem title="Brands" subtitle="Machine brands" trailing={<Chevron />} onPress={() => { router.push('/library/brands'); }} />
            </Card>
        </Screen>
    );
}
