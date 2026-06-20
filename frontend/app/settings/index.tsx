import { useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Card, ListItem, Screen, Tag, Text } from '@/components';
import { useAuth } from '@/modules/identity/identity-hook';
import type { WeightUnit } from '@/lib/weight';
import { theme } from '@/theme/theme';

/**
 * @function SettingsScreen
 * @description Grouped settings placeholder: a profile summary, a kg/lbs units stub (not yet persisted), a gyms row, and a confirmed sign-out.
 *
 * @returns {ReactElement} The settings screen element.
 */
export default function SettingsScreen(): ReactElement {
    const { profile, signOut } = useAuth();
    const [unit, setUnit] = useState<WeightUnit>(profile !== null ? profile.weightUnit : 'KG');

    const confirmSignOut = (): void => {
        Alert.alert('Sign out', 'You will need to sign in again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: (): void => { void signOut(); } }
        ]);
    };

    return (
        <Screen scroll>
            <View style={styles.content}>
                <Card>
                    <Text variant="headline">{profile !== null ? `${profile.firstname} ${profile.lastname}` : 'Account'}</Text>
                    <Text variant="footnote" tone="secondary">{profile !== null ? profile.email : ''}</Text>
                </Card>
                <Card>
                    <Text variant="caption" tone="secondary">Units</Text>
                    <View style={styles.units}>
                        <Tag label="kg" active={unit !== 'LBS'} onPress={() => { setUnit('KG'); }} />
                        <Tag label="lbs" active={unit === 'LBS'} onPress={() => { setUnit('LBS'); }} />
                    </View>
                </Card>
                <Card>
                    <ListItem title="Gyms" subtitle="Manage your gyms" trailing={<Text tone="secondary">›</Text>} />
                </Card>
                <Button label="Sign out" variant="danger" onPress={confirmSignOut} />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { gap: theme.spacing.lg16, padding: theme.spacing.lg16 },
    units: { flexDirection: 'row', gap: theme.spacing.sm8, marginTop: theme.spacing.sm8 }
});
