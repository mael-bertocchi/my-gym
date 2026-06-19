const expoConfig = require('eslint-config-expo/flat');
const jsdoc = require('eslint-plugin-jsdoc');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');

/**
 * @constant eslintConfig
 * @description Flat ESLint config: Expo base + a JSDoc description requirement (accepting the CLAUDE.md `@description`-tag hybrid style) + explicit return types + a ban on `as` assertions. The jsdoc TypeScript preset is intentionally NOT used — it bans the typed `@param`/`@returns` that CLAUDE.md mandates.
 */
module.exports = [
    ...expoConfig,
    {
        plugins: { jsdoc, '@typescript-eslint': typescriptEslint },
        rules: {
            'jsdoc/require-description': ['error', { descriptionStyle: 'any' }],
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }]
        }
    },
    {
        ignores: ['.expo/', 'node_modules/', 'babel.config.js', 'metro.config.js']
    }
];
