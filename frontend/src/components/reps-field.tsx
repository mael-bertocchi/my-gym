// frontend/src/components/reps-field.tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import type { ReactElement } from 'react';
import { Text } from '@/components/text';
import { theme } from '@/theme/theme';
import { typography } from '@/theme/typography';
import type { Maybe } from '@/shared/models';

/**
 * @interface RepsFieldProps
 * @description Props for the integer reps field with ±1 steppers (no unit semantics).
 */
export interface RepsFieldProps {
    value: Maybe<number>; /*!< Rep count, or null when blank */
    onChange: (reps: Maybe<number>) => void; /*!< Change handler */
    disabled?: boolean; /*!< Disables entry */
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    stepper: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.surface, borderRadius: theme.radius.control12 },
    field: { backgroundColor: theme.color.surface, borderRadius: theme.radius.control12, paddingHorizontal: theme.spacing.md12, paddingVertical: theme.spacing.sm8, marginHorizontal: theme.spacing.sm8 },
    input: { ...typography.bodyTabular, color: theme.color.textPrimary, minWidth: 48, textAlign: 'center', padding: 0 }
});

/**
 * @function parseReps
 * @description Parses a typed integer string to a non-negative rep count, null when empty/invalid.
 *
 * @param {string} input The raw text.
 * @returns {Maybe<number>} The reps, or null.
 */
function parseReps(input: string): Maybe<number> {
    const trimmed: string = input.trim();
    if (trimmed.length === 0) {
        return null;
    }
    const value: number = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) {
        return null;
    }
    return Math.floor(value);
}

/**
 * @function RepsField
 * @description Edits an integer rep count with flanking − / + steppers; renders an em dash when disabled.
 *
 * @param {RepsFieldProps} props The reps-field props.
 * @returns {ReactElement} The reps-field element.
 */
export function RepsField(props: RepsFieldProps): ReactElement {
    const [text, setText] = useState<string>(props.value !== null ? String(props.value) : '');

    useEffect((): void => {
        setText(props.value !== null ? String(props.value) : '');
    }, [props.value]);

    if (props.disabled ?? false) {
        return <Text variant="bodyTabular" tone="secondary">{'—'}</Text>;
    }

    const onChangeText = (next: string): void => {
        setText(next);
        props.onChange(parseReps(next));
    };

    const onDecrement = (): void => {
        props.onChange(Math.max(0, (props.value ?? 0) - 1));
    };
    const onIncrement = (): void => {
        props.onChange((props.value ?? 0) + 1);
    };

    return (
        <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={onDecrement} style={styles.stepper}><Text variant="headline" tone="accent">{'−'}</Text></Pressable>
            <View style={styles.field}><RNTextInput value={text} onChangeText={onChangeText} keyboardType="number-pad" selectTextOnFocus={true} style={styles.input} /></View>
            <Pressable accessibilityRole="button" onPress={onIncrement} style={styles.stepper}><Text variant="headline" tone="accent">{'+'}</Text></Pressable>
        </View>
    );
}
