const expoConfig = require('eslint-config-expo/flat');
const jsdoc = require('eslint-plugin-jsdoc');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');

/**
 * @constant eslintConfig
 * @description Flat ESLint config: Expo base + a JSDoc description requirement (accepting the CLAUDE.md `@description`-tag hybrid style) applied to every file, plus explicit return types and a ban on `as` assertions scoped to TS files only. The TS rules cannot apply to `.mjs`/`.js` sources because Expo lints those with the non-TS espree parser, which rejects TS syntax. The jsdoc TypeScript preset is intentionally NOT used — it bans the typed `@param`/`@returns` that CLAUDE.md mandates.
 */
module.exports = [
    ...expoConfig,
    {
        plugins: { jsdoc },
        rules: {
            'jsdoc/require-description': ['error', { descriptionStyle: 'any' }]
        }
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: { '@typescript-eslint': typescriptEslint },
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }]
        }
    },
    {
        ignores: ['.expo/', 'node_modules/', 'babel.config.js', 'metro.config.js']
    }
];
