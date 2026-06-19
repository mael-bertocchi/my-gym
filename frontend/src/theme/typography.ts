import type { TextStyle } from 'react-native';

/**
 * @constant typography
 * @description The two-weight (400/600) type scale (§2.3). `bodyTabular` / `headlineTabular` enable tabular-nums for set values and stats.
 */
export const typography = {
    largeTitle: { fontSize: 34, fontWeight: '600' },
    title: { fontSize: 22, fontWeight: '600' },
    headline: { fontSize: 17, fontWeight: '600' },
    body: { fontSize: 15, fontWeight: '400' },
    subhead: { fontSize: 14, fontWeight: '400' },
    footnote: { fontSize: 13, fontWeight: '400' },
    caption: { fontSize: 11, fontWeight: '400' },
    bodyTabular: { fontSize: 15, fontWeight: '400', fontVariant: ['tabular-nums'] },
    headlineTabular: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }
} as const satisfies Record<string, TextStyle>;

/**
 * @type TypographyVariant
 * @description Union of the available text variants.
 */
export type TypographyVariant = keyof typeof typography;
