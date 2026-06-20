import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import type { ReactElement } from 'react';
import { Text } from '@/components/text';
import { theme } from '@/theme/theme';
import { typography } from '@/theme/typography';
import { KG_PER_LB, parseDecimal } from '@/lib/weight';
import type { WeightUnit } from '@/lib/weight';
import { useWeightUnit } from '@/lib/use-weight-unit';
import type { Maybe } from '@/shared/models';

/**
 * @interface NumericFieldProps
 * @description Props for the unit-aware `NumericField`. The stored value and `onChange` are always in kilograms; the field displays and accepts the user's unit.
 */
export interface NumericFieldProps {
    value: Maybe<number>; /*!< Stored weight in kg, or null for bodyweight */
    onChange: (weightKg: Maybe<number>) => void; /*!< Change handler receiving kg */
    step?: number; /*!< Stepper increment in kg; defaults to 2.5 */
    disabled?: boolean; /*!< Bodyweight mode: hides the field and steppers */
}

/**
 * @function toDisplay
 * @description Converts a kg-stored weight to the string shown in the user's unit.
 *
 * @param {Maybe<number>} kg The stored weight in kilograms, or null.
 * @param {WeightUnit} unit The user's display unit.
 * @returns {string} The display string ('' when null).
 */
function toDisplay(kg: Maybe<number>, unit: WeightUnit): string {
    if (kg === null) {
        return '';
    }
    return String(unit !== 'LBS' ? kg : Math.round((kg / KG_PER_LB) * 100) / 100);
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    stepper: {
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.color.surface,
        borderRadius: theme.radius.control12
    },
    field: {
        backgroundColor: theme.color.surface,
        borderRadius: theme.radius.control12,
        paddingHorizontal: theme.spacing.md12,
        paddingVertical: theme.spacing.sm8,
        marginHorizontal: theme.spacing.sm8
    },
    input: {
        ...typography.bodyTabular,
        color: theme.color.textPrimary,
        minWidth: 64,
        textAlign: 'center',
        padding: 0
    },
    unit: {
        marginLeft: theme.spacing.sm8
    }
});

/**
 * @function NumericField
 * @description Edits a kg-stored weight in the user's display unit, with flanking − / + steppers operating in kg. Renders an em dash when disabled (bodyweight).
 *
 * @param {NumericFieldProps} props The numeric-field props.
 * @returns {ReactElement} The numeric-field element.
 */
export function NumericField(props: NumericFieldProps): ReactElement {
    const unit: WeightUnit = useWeightUnit();
    const step: number = props.step ?? 2.5;
    const [text, setText] = useState<string>(toDisplay(props.value, unit));

    useEffect((): void => {
        setText(toDisplay(props.value, unit));
    }, [props.value, unit]);

    if (props.disabled ?? false) {
        return <Text variant="bodyTabular" tone="secondary">{'—'}</Text>;
    }

    const onChangeText = (next: string): void => {
        setText(next);
        const n: Maybe<number> = parseDecimal(next);
        props.onChange(n === null ? null : (unit !== 'LBS' ? n : n * KG_PER_LB));
    };

    const onDecrement = (): void => {
        props.onChange(Math.max(0, (props.value ?? 0) - step));
    };
    const onIncrement = (): void => {
        props.onChange((props.value ?? 0) + step);
    };

    const unitLabel: string = unit !== 'LBS' ? 'kg' : 'lbs';

    return (
        <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={onDecrement} style={styles.stepper}><Text variant="headline" tone="accent">{'−'}</Text></Pressable>
            <View style={styles.field}>
                <RNTextInput value={text} onChangeText={onChangeText} keyboardType="decimal-pad" selectTextOnFocus={true} style={styles.input} />
            </View>
            <Pressable accessibilityRole="button" onPress={onIncrement} style={styles.stepper}><Text variant="headline" tone="accent">{'+'}</Text></Pressable>
            <Text variant="footnote" tone="secondary" style={styles.unit}>{unitLabel}</Text>
        </View>
    );
}
