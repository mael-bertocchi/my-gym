import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, EquipmentGrid, Sheet, Tag, Text, TextInput } from '@/components';
import { useCreateMachineBrand, useCreateVariant, useMachineBrands } from '@/modules/exercise-library/exercise-library-hook';
import type { EquipmentType, MachineBrand } from '@/modules/exercise-library/exercise-library-models';
import { isApiError } from '@/shared/models';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

const styles = StyleSheet.create({
    title: { marginBottom: theme.spacing.lg16 },
    label: { marginTop: theme.spacing.lg16, marginBottom: theme.spacing.sm8 },
    brandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm8, marginBottom: theme.spacing.md12 },
    newBrandRow: { marginTop: theme.spacing.md12 },
    addBrand: { marginTop: theme.spacing.md12 },
    error: { marginTop: theme.spacing.md12 }
});

/**
 * @function AddVariantScreen
 * @description The Add Variant sheet: tap an equipment chip to commit (non-MACHINE dismisses immediately); MACHINE reveals a brand picker that commits on brand tap, with an inline new-brand creator. 409s surface inline and keep the sheet open.
 *
 * @returns {ReactElement} The Add Variant sheet element.
 */
export default function AddVariantScreen(): ReactElement {
    const params = useLocalSearchParams<{ exerciseId: string }>();
    const exerciseId: string = params.exerciseId ?? '';

    const [pendingMachine, setPendingMachine] = useState<boolean>(false);
    const [newBrand, setNewBrand] = useState<string>('');
    const [error, setError] = useState<Maybe<string>>(null);

    const createVariant = useCreateVariant(exerciseId);
    const createBrand = useCreateMachineBrand();
    const brands = useMachineBrands('');

    const brandRows: MachineBrand[] = useMemo(() => (brands.data?.pages ?? []).flatMap((page) => page.data), [brands.data]);

    const submit = (equipmentType: EquipmentType, machineBrandId: Maybe<string>): void => {
        setError(null);
        createVariant.mutate(
            { equipmentType, machineBrandId },
            {
                onSuccess: (): void => { router.back(); },
                onError: (err: Error): void => {
                    if (isApiError(err) && err.status === 409) {
                        setError('This variant already exists.');
                        return;
                    }
                    setError('Couldn’t add the variant. Try again.');
                }
            }
        );
    };

    const onEquipment = (type: EquipmentType): void => {
        setError(null);
        if (type !== 'MACHINE') {
            submit(type, null);
            return;
        }
        setPendingMachine(true);
    };

    const onBrand = (brandId: string): void => {
        submit('MACHINE', brandId);
    };

    const onCreateBrand = (): void => {
        const name: string = newBrand.trim();
        if (name.length === 0) {
            return;
        }
        setError(null);
        createBrand.mutate(name, {
            onSuccess: (brand: MachineBrand): void => { submit('MACHINE', brand.id); },
            onError: (err: Error): void => {
                if (isApiError(err) && err.status === 409) {
                    setError('A brand with this name already exists.');
                    return;
                }
                setError('Couldn’t create the brand. Try again.');
            }
        });
    };

    return (
        <Sheet>
            <Text variant="title" tone="primary" style={styles.title}>Add variant</Text>
            <ScrollView>
                <Text variant="caption" tone="secondary" style={styles.label}>Equipment</Text>
                <EquipmentGrid selected={!pendingMachine ? null : 'MACHINE'} disabled={createVariant.isPending} onSelect={onEquipment} />
                {!pendingMachine ? null : (
                    <View>
                        <Text variant="caption" tone="secondary" style={styles.label}>Brand</Text>
                        <View style={styles.brandGrid}>{brandRows.map((brand) => <Tag key={brand.id} label={brand.name} onPress={() => { onBrand(brand.id); }} />)}</View>
                        <View style={styles.newBrandRow}><TextInput value={newBrand} onChangeText={setNewBrand} label="New brand" placeholder="Hammer Strength" autoCapitalize="sentences" returnKeyType="done" onSubmitEditing={onCreateBrand} /></View>
                        <Button label="Add brand" variant="secondary" onPress={onCreateBrand} loading={createBrand.isPending} disabled={newBrand.trim().length === 0} style={styles.addBrand} />
                    </View>
                )}
                {error !== null ? <Text variant="footnote" tone="danger" style={styles.error}>{error}</Text> : null}
            </ScrollView>
        </Sheet>
    );
}
