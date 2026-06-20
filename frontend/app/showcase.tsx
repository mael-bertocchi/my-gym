import { useState } from 'react';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Card, GlassSurface, ListItem, NumericField, Screen, Text } from '@/components';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

/**
 * @function ShowcaseScreen
 * @description Foundation proof screen: a native glass stack header, solid Card/ListItem content, a GlassSurface capsule, a unit-aware NumericField, and a bottom-anchored primary Button in the thumb-arc footer.
 *
 * @returns {ReactElement} The showcase element.
 */
export default function ShowcaseScreen(): ReactElement {
    const [weightKg, setWeightKg] = useState<Maybe<number>>(60);

    const footer = <Button label="Primary action" variant="primary" onPress={() => { setWeightKg(60); }} />;

    return (
        <Screen footer={footer} scroll>
            <Stack.Screen options={{ headerShown: true, title: 'Showcase' }} />
            <View style={styles.content}>
                <Text variant="title">Foundation kit</Text>
                <Card><Text variant="body">A solid Card surface with a hairline border.</Text></Card>
                <Card><ListItem title="List item" subtitle="A tappable row" trailing={<Text tone="secondary">›</Text>} /></Card>
                <GlassSurface radius={theme.radius.card16} style={styles.glass}><Text variant="headline" tone="accent">GlassSurface capsule</Text></GlassSurface>
                <Card><Text variant="caption" tone="secondary">Unit-aware weight</Text><NumericField value={weightKg} onChange={setWeightKg} /></Card>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { gap: theme.spacing.lg16, padding: theme.spacing.lg16 },
    glass: { padding: theme.spacing.lg16, alignItems: 'center' }
});
