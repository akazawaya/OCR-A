import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh"; // 基本は無視するが、warnは出しておく
import { defineConfig, globalIgnores } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintConfigPrettier from "eslint-config-prettier";
import reactPlugin from "eslint-plugin-react";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      eslintConfigPrettier,
    ],
    plugins: {
      import: importPlugin,
      react: reactPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      "import/no-cycle": "error",
      "import/no-duplicates": "error",
      "import/no-useless-path-segments": "error",
      "import/newline-after-import": "error",
      "import/order": ["error", { "newlines-between": "always" }],
      "func-style": ["error", "expression"],
      "prefer-arrow-callback": "error",
      "no-irregular-whitespace": ["error", { skipComments: true }],
      "no-unused-vars": ["error", { varsIgnorePattern: "^_" }],
      "react/jsx-uses-vars": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-refresh/only-export-components": "warn",
      "jsx-a11y/label-has-associated-control": [
        "error",
        {
          controlComponents: ["TextInput", "Button"],
        },
      ],
      "react/jsx-sort-props": [
        "warn",
        {
          callbacksLast: true,
          shorthandLast: true,
          reservedFirst: true,
        },
      ],
    },
  },
]);
