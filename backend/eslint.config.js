import eslint from "@eslint/js";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: { "import-x": importX },
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],

      // Import ordering
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import-x/no-duplicates": "error",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "no-return-await": "off",
      "@typescript-eslint/return-await": ["error", "always"],
    },
  },
  {
    ignores: ["dist/", "node_modules/", "*.js", "prisma.config.ts", "prisma/generated/"],
  },
);
