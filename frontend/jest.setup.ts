/**
 * @module jest.setup
 * @description Test-environment mocks for native modules so pure-logic suites run under Node.
 */
jest.mock('expo-secure-store', () => {
    const store: Record<string, string> = {};
    return {
        getItemAsync: jest.fn(async (key: string) => (key in store ? store[key] : null)),
        setItemAsync: jest.fn(async (key: string, value: string) => { store[key] = value; }),
        deleteItemAsync: jest.fn(async (key: string) => { delete store[key]; }),
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY'
    };
});

jest.mock('expo-glass-effect', () => ({
    isLiquidGlassAvailable: jest.fn(() => false),
    GlassView: 'GlassView',
    GlassContainer: 'GlassContainer'
}));

jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Medium: 'medium' } }));

jest.mock('expo-notifications', () => ({
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    setNotificationChannelAsync: jest.fn(async () => undefined),
    scheduleNotificationAsync: jest.fn(async () => 'notif-id'),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' }
}));
