import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import type { Maybe } from '@/shared/models';

/**
 * @constant ANDROID_CHANNEL_ID
 * @description The Android notification channel used for the rest-timer alert.
 */
const ANDROID_CHANNEL_ID: string = 'rest-timer';

/**
 * @interface RestTimer
 * @description Controls for the auto-starting, drift-free rest countdown.
 */
export interface RestTimer {
    remainingSec: number; /*!< Seconds left; 0 when idle/done */
    isRunning: boolean; /*!< Whether a countdown is active */
    start: (seconds: number) => void; /*!< Begins (or restarts) the countdown */
    adjust: (deltaSec: number) => void; /*!< Adds/subtracts seconds (e.g. −15 / +15) */
    skip: () => void; /*!< Cancels the countdown immediately */
}

/**
 * @function computeRemainingSec
 * @description Pure: seconds remaining until endsAt (ceil), clamped to 0; 0 when no target.
 *
 * @param {Maybe<number>} endsAt The target epoch ms, or null when idle.
 * @param {number} now The current epoch ms.
 * @returns {number} The remaining whole seconds.
 */
export function computeRemainingSec(endsAt: Maybe<number>, now: number): number {
    if (endsAt === null) {
        return 0;
    }
    return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/**
 * @function ensureNotificationSetup
 * @description Lazily requests notification permission and, on Android, creates the rest-timer channel.
 *
 * @returns {Promise<void>} Resolves once permission/channel are ensured.
 */
async function ensureNotificationSetup(): Promise<void> {
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) {
        await Notifications.requestPermissionsAsync();
    }
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, { name: 'Rest timer', importance: Notifications.AndroidImportance.DEFAULT });
    }
}

/**
 * @function useRestTimer
 * @description A drift-free rest countdown using a monotonic target timestamp; fires a haptic + local notification at zero, reschedulable on adjust and cancellable on skip.
 *
 * @returns {RestTimer} The timer controls.
 */
export function useRestTimer(): RestTimer {
    const [endsAt, setEndsAt] = useState<Maybe<number>>(null);
    const [remainingSec, setRemainingSec] = useState<number>(0);
    const notificationId = useRef<Maybe<string>>(null);

    const cancelNotification = useCallback((): void => {
        if (notificationId.current !== null) {
            void Notifications.cancelScheduledNotificationAsync(notificationId.current);
            notificationId.current = null;
        }
    }, []);

    const schedule = useCallback(async (seconds: number): Promise<void> => {
        cancelNotification();
        if (seconds <= 0) {
            return;
        }
        await ensureNotificationSetup();
        notificationId.current = await Notifications.scheduleNotificationAsync({ content: { title: 'Rest done', body: 'Time for your next set' }, trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: ANDROID_CHANNEL_ID } });
    }, [cancelNotification]);

    const start = useCallback((seconds: number): void => {
        setEndsAt(Date.now() + seconds * 1000);
        void schedule(seconds);
    }, [schedule]);

    const adjust = useCallback((deltaSec: number): void => {
        setEndsAt((prev) => {
            if (prev === null) {
                return prev;
            }
            const next: number = Math.max(Date.now(), prev + deltaSec * 1000);
            void schedule(Math.ceil((next - Date.now()) / 1000));
            return next;
        });
    }, [schedule]);

    const skip = useCallback((): void => {
        setEndsAt(null);
        setRemainingSec(0);
        cancelNotification();
    }, [cancelNotification]);

    useEffect(() => {
        if (endsAt === null) {
            return;
        }
        const tick = (): void => {
            const left: number = computeRemainingSec(endsAt, Date.now());
            setRemainingSec(left);
            if (left <= 0) {
                setEndsAt(null);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        };
        tick();
        const id = setInterval(tick, 250);
        return (): void => { clearInterval(id); };
    }, [endsAt]);

    useEffect((): (() => void) => {
        return (): void => { cancelNotification(); };
    }, [cancelNotification]);

    return { remainingSec, isRunning: endsAt !== null, start, adjust, skip };
}
