import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Shimmer } from '@/components/shimmer';
import { deriveAiState, humanizeEnum } from '@/modules/exercise-library/exercise-library-models';
import type { AiCardState, ExerciseVariant } from '@/modules/exercise-library/exercise-library-models';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

/**
 * @interface VariantCardProps
 * @description Props for the solid `VariantCard` that renders all four AI-onboarding states and a swipe-to-delete action.
 */
export interface VariantCardProps {
    variant: ExerciseVariant; /*!< The variant to render */
    brandName: Maybe<string>; /*!< Resolved MACHINE brand name, or null */
    onRegenerate: () => void; /*!< Re-runs AI onboarding for this variant */
    onDelete: () => void; /*!< Begins the deferred-delete-with-undo for this variant */
    regenerating: boolean; /*!< Whether a regenerate is in flight (disables the action) */
}

const styles = StyleSheet.create({
    card: { marginBottom: theme.spacing.md12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md12 },
    title: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm8, flex: 1 },
    section: { marginBottom: theme.spacing.md12 },
    sectionLabel: { marginBottom: theme.spacing.xs4 },
    shimmerRow: { gap: theme.spacing.sm8, marginBottom: theme.spacing.md12 },
    failedRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm8 },
    deleteAction: { backgroundColor: theme.color.dangerFill, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.xl24, marginBottom: theme.spacing.md12, borderRadius: theme.radius.card16 }
});

/**
 * @function buildTitle
 * @description Builds the variant card title from equipment plus an optional brand name.
 *
 * @param {ExerciseVariant} variant The variant.
 * @param {Maybe<string>} brandName The resolved brand name.
 * @returns {string} The composed title.
 */
function buildTitle(variant: ExerciseVariant, brandName: Maybe<string>): string {
    const equipment: string = humanizeEnum(variant.equipmentType);
    if (brandName !== null) {
        return `${equipment} · ${brandName}`;
    }
    return equipment;
}

/**
 * @function VariantCard
 * @description Renders a variant as a SOLID card whose body reflects the AI state: pending (shimmer), generated (Form / How to / Equipment tips + Regenerate), or failed (inline retry). A right-swipe reveals Delete. Body cross-fades in via reanimated FadeIn (legal: the card is solid content, not glass).
 *
 * @param {VariantCardProps} props The variant-card props.
 * @returns {ReactElement} The variant-card element.
 */
export function VariantCard(props: VariantCardProps): ReactElement {
    const state: AiCardState = deriveAiState(props.variant.aiContentStatus);
    const title: string = buildTitle(props.variant, props.brandName);

    let body: ReactElement;
    if (state !== 'generated') {
        if (state !== 'failed') {
            body = (
                <View style={styles.shimmerRow}>
                    <Shimmer width="90%" />
                    <Shimmer width="100%" />
                    <Shimmer width="70%" />
                    <Text variant="caption" tone="tertiary">{'Writing coaching notes…'}</Text>
                </View>
            );
        } else {
            body = (
                <View style={styles.failedRow}>
                    <Ionicons name="alert-circle-outline" size={18} color={theme.color.danger} />
                    <Text variant="footnote" tone="danger">{`Couldn’t write notes · Try again`}</Text>
                </View>
            );
        }
    } else {
        body = (
            <View>
                <View style={styles.section}>
                    <Text variant="caption" tone="secondary" style={styles.sectionLabel}>{'Form'}</Text>
                    <Text variant="body" tone="primary">{props.variant.formSummary ?? ''}</Text>
                </View>
                <View style={styles.section}>
                    <Text variant="caption" tone="secondary" style={styles.sectionLabel}>{'How to'}</Text>
                    <Text variant="body" tone="primary">{props.variant.instructions ?? ''}</Text>
                </View>
                <View style={styles.section}>
                    <Text variant="caption" tone="secondary" style={styles.sectionLabel}>{'Equipment tips'}</Text>
                    <Text variant="body" tone="primary">{props.variant.equipmentTips ?? ''}</Text>
                </View>
            </View>
        );
    }

    const renderRightActions = (): ReactElement => {
        return (
            <Pressable accessibilityRole="button" onPress={props.onDelete} style={styles.deleteAction}><Text variant="headline" tone="danger">{'Delete'}</Text></Pressable>
        );
    };

    return (
        <Swipeable renderRightActions={renderRightActions}>
            <Card style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.title}><Ionicons name="barbell-outline" size={18} color={theme.color.textSecondary} /><Text variant="headline" tone="primary" numberOfLines={1}>{title}</Text></View>
                </View>
                <Animated.View key={state} entering={FadeIn.duration(theme.motion.base220)}>{body}</Animated.View>
                {state !== 'pending' ? <Button label={state !== 'failed' ? 'Regenerate' : 'Try again'} variant="ghost" loading={props.regenerating} onPress={props.onRegenerate} /> : null}
            </Card>
        </Swipeable>
    );
}
