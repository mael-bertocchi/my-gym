import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import type { ReactElement } from 'react';
import { Button, ErrorState, ListItem, Screen, Spinner, Text, TextInput } from '@/components';
import { useCreateMachineBrand, useDebouncedValue, useMachineBrands } from '@/modules/exercise-library/exercise-library-hook';
import type { MachineBrand } from '@/modules/exercise-library/exercise-library-models';
import { isApiError } from '@/shared/models';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

const styles = StyleSheet.create({
    search: { marginBottom: theme.spacing.md12 },
    centered: { paddingVertical: theme.spacing.xl24, alignItems: 'center' },
    addRow: { marginTop: theme.spacing.lg16, gap: theme.spacing.sm8 },
    error: { marginTop: theme.spacing.sm8 }
});

/**
 * @function BrandsScreen
 * @description Machine-brands management: a persistently-mounted debounced search list plus an inline create-brand control. 409 (duplicate name) surfaces inline.
 *
 * @returns {ReactElement} The brands screen element.
 */
export default function BrandsScreen(): ReactElement {
    const [raw, setRaw] = useState<string>('');
    const [newBrand, setNewBrand] = useState<string>('');
    const [error, setError] = useState<Maybe<string>>(null);
    const search: string = useDebouncedValue(raw, 250);

    const brands = useMachineBrands(search);
    const create = useCreateMachineBrand();

    const rows: MachineBrand[] = useMemo(() => (brands.data?.pages ?? []).flatMap((page) => page.data), [brands.data]);

    const onEndReached = (): void => {
        if (brands.hasNextPage && !brands.isFetchingNextPage) {
            void brands.fetchNextPage();
        }
    };

    const onCreate = (): void => {
        const name: string = newBrand.trim();
        if (name.length === 0) {
            return;
        }
        setError(null);
        create.mutate(name, {
            onSuccess: (): void => { setNewBrand(''); },
            onError: (err: Error): void => {
                if (isApiError(err) && err.status === 409) {
                    setError('A brand with this name already exists.');
                    return;
                }
                setError('Failed to create the brand. Try again.');
            }
        });
    };

    const renderItem = (info: ListRenderItemInfo<MachineBrand>): ReactElement => {
        return <ListItem title={info.item.name} />;
    };

    let listState: Maybe<ReactElement> = null;
    if (brands.isPending) {
        listState = <View style={styles.centered}><Spinner size="large" /></View>;
    } else if (brands.isError) {
        listState = <ErrorState message="Couldn’t load brands" onRetry={() => { void brands.refetch(); }} />;
    } else {
        listState = <View style={styles.centered}><Text variant="footnote" tone="tertiary">{'No brands yet.'}</Text></View>;
    }

    const footer: ReactElement = (
        <View style={styles.addRow}>
            <TextInput value={newBrand} onChangeText={setNewBrand} label="New brand" placeholder="Hammer Strength" autoCapitalize="sentences" returnKeyType="done" onSubmitEditing={onCreate} />
            {error !== null ? <Text variant="footnote" tone="danger" style={styles.error}>{error}</Text> : null}
            <Button label="Add brand" onPress={onCreate} loading={create.isPending} disabled={newBrand.trim().length === 0} />
        </View>
    );

    return (
        <Screen>
            <TextInput value={raw} onChangeText={setRaw} placeholder="Search brands" autoCapitalize="none" returnKeyType="done" style={styles.search} />
            <FlatList data={rows} keyExtractor={(item) => item.id} renderItem={renderItem} ListFooterComponent={footer} ListEmptyComponent={listState} onEndReached={onEndReached} onEndReachedThreshold={0.4} />
        </Screen>
    );
}
