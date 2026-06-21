import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactElement } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { EQUIPMENT_TYPES, EQUIPMENT_ICONS, humanizeEnum } from '@/modules/exercise-library/exercise-library-models';
import type { EquipmentType } from '@/modules/exercise-library/exercise-library-models';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

/**
 * @interface EquipmentGridProps
 * @description Props for the solid, tap-to-commit `EquipmentGrid`.
 */
export interface EquipmentGridProps {
    selected: Maybe<EquipmentType>; /*!< The currently highlighted equipment, or null */
    onSelect: (type: EquipmentType) => void; /*!< Fired with the typed equipment when a chip is tapped */
    disabled?: boolean; /*!< Blocks taps while a mutation is in flight */
}

const styles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm8 },
    cell: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm8, paddingHorizontal: theme.spacing.md12, paddingVertical: theme.spacing.sm8, borderRadius: theme.radius.pill999, backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.borderSubtle },
    cellActive: { backgroundColor: theme.color.accentMuted, borderColor: theme.color.accent },
    cellDisabled: { opacity: 0.5 }
});

/**
 * @function EquipmentGrid
 * @description Renders a wrapping grid of solid equipment chips (icon + label); tapping a chip commits the selection via onSelect.
 *
 * @param {EquipmentGridProps} props The equipment-grid props.
 * @returns {ReactElement} The equipment-grid element.
 */
export function EquipmentGrid(props: EquipmentGridProps): ReactElement {
    const disabled: boolean = props.disabled ?? false;

    return (
        <View style={styles.grid}>
            {EQUIPMENT_TYPES.map((type) => {
                const active: boolean = props.selected === type;
                const cellStyle: StyleProp<ViewStyle> = [styles.cell, active ? styles.cellActive : null, disabled ? styles.cellDisabled : null];
                const tint: string = active ? theme.color.accent : theme.color.textSecondary;
                return <Pressable key={type} accessibilityRole="button" disabled={disabled} onPress={() => { props.onSelect(type); }} style={cellStyle}><MaterialCommunityIcons name={EQUIPMENT_ICONS[type]} size={18} color={tint} /><Text variant="footnote" tone={active ? 'accent' : 'secondary'}>{humanizeEnum(type)}</Text></Pressable>;
            })}
        </View>
    );
}
