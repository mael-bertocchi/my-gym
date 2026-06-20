import { useState } from 'react';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Screen, Text, TextInput } from '@/components';
import { useAuth } from '@/modules/identity/identity-hook';
import { isApiError } from '@/shared/models';
import { theme } from '@/theme/theme';

/**
 * @function SignInScreen
 * @description The single sign-in screen: email + password biased low into the thumb arc, with an inline error on failed auth (401 maps to bad credentials; otherwise a connection error). No navigation here. A successful sign-in flips auth status and the root gate routes into the tabs.
 *
 * @returns {ReactElement} The sign-in screen element.
 */
export default function SignInScreen(): ReactElement {
    const { signIn } = useAuth();
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const submit = async (): Promise<void> => {
        if (loading) {
            return;
        }
        setError('');
        setLoading(true);
        try {
            await signIn(email, password);
        } catch (caught: unknown) {
            if (isApiError(caught) && caught.status === 401) {
                setError('Invalid email or password');
            } else {
                setError('Could not sign in. Check your connection and try again.');
            }
            setLoading(false);
        }
    };

    const footer = <Button label="Sign in" variant="primary" loading={loading} onPress={() => { void submit(); }} />;

    return (
        <Screen footer={footer}>
            <View style={styles.body}>
                <Text variant="largeTitle">Sign in</Text>
                <View style={styles.fields}>
                    <TextInput value={email} onChangeText={setEmail} label="Email" placeholder="you@example.com" autoFocus keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
                    <TextInput value={password} onChangeText={setPassword} label="Password" secureTextEntry returnKeyType="go" onSubmitEditing={() => { void submit(); }} error={error.length > 0 ? error : undefined} />
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    body: { flex: 1, justifyContent: 'flex-end', gap: theme.spacing.xl24, paddingHorizontal: theme.spacing.lg16, paddingBottom: theme.spacing.xl24 },
    fields: { gap: theme.spacing.md12 }
});
