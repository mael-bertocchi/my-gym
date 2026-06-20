import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

/**
 * @type GlassTier
 * @description Which rendering tier a glass surface should use (§5 3-tier guard).
 */
export type GlassTier = 'liquid' | 'blur' | 'solid';

/**
 * @interface GlassInputs
 * @description Inputs to the pure tier selector.
 */
export interface GlassInputs {
    reduceTransparency: boolean; /*!< OS Reduce Transparency setting */
    liquidGlassAvailable: boolean; /*!< iOS 26 Liquid Glass API present */
}

/**
 * @function selectGlassTier
 * @description Pure tier resolver: Reduce Transparency wins (solid); else liquid when available; else blur.
 *
 * @param {GlassInputs} inputs The current accessibility/capability inputs.
 * @returns {GlassTier} The resolved tier.
 */
export function selectGlassTier(inputs: GlassInputs): GlassTier {
    if (inputs.reduceTransparency) {
        return 'solid';
    }
    if (inputs.liquidGlassAvailable) {
        return 'liquid';
    }
    return 'blur';
}

/**
 * @function useGlassAvailability
 * @description Subscribes to Reduce Transparency and resolves the live glass tier.
 *
 * @returns {GlassTier} The current tier.
 */
export function useGlassAvailability(): GlassTier {
    const [reduce, setReduce] = useState<boolean>(false);

    useEffect(() => {
        let active: boolean = true;
        void AccessibilityInfo.isReduceTransparencyEnabled().then((on: boolean) => {
            if (active) { setReduce(on); }
        });
        const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
        return (): void => { active = false; sub.remove(); };
    }, []);

    return selectGlassTier({ reduceTransparency: reduce, liquidGlassAvailable: isLiquidGlassAvailable() });
}
