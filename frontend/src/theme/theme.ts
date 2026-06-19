/**
 * @constant theme
 * @description The single dark theme token set (§2): colors, 4pt spacing, radii, elevation, motion. Frozen with `as const` for literal-narrowed reads; no `as` type assertions anywhere.
 */
export const theme = {
    color: {
        background: '#0B0E13',
        surface: '#141922',
        raised: '#1C2330',
        glassTint: 'rgba(20,25,34,0.72)',
        borderSubtle: 'rgba(255,255,255,0.07)',
        borderStrong: 'rgba(255,255,255,0.12)',
        textPrimary: '#F4F7FC',
        textSecondary: 'rgba(235,240,250,0.62)',
        textTertiary: 'rgba(235,240,250,0.40)',
        textDisabled: 'rgba(235,240,250,0.25)',
        accent: '#3DA9FC',
        accentMuted: 'rgba(61,169,252,0.16)',
        onAccent: '#04243F',
        success: '#2DC487',
        successFill: 'rgba(45,196,135,0.16)',
        warning: '#F0AA28',
        warningFill: 'rgba(240,170,40,0.16)',
        danger: '#F05555',
        dangerFill: 'rgba(240,85,85,0.16)'
    },
    spacing: { xs4: 4, sm8: 8, md12: 12, lg16: 16, xl24: 24, xxl32: 32 },
    radius: { pill999: 999, control12: 12, card16: 16, sheet24: 24, screenEdge: 28 },
    elevation: {
        glass: { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
        card: { shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }
    },
    motion: { fast150: 150, base220: 220, easing: 'cubic-bezier(0.2,0,0,1)' }
} as const;

/**
 * @type Theme
 * @description The literal-narrowed shape of the theme token set.
 */
export type Theme = typeof theme;
