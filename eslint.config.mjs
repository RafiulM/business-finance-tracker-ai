import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "coverage/**",
      "drizzle/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },
  {
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-const": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // General code quality rules
      "prefer-const": "error",
      "no-var": "error",
      "no-console": "warn",
      "no-debugger": "error",
      "no-alert": "error",

      // React specific rules
      "react/prop-types": "off", // Using TypeScript for prop validation
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "error",

      // Import/Export rules
      "no-duplicate-imports": "error",

      // Security rules
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // Code style
      "comma-dangle": ["error", "always-multiline"],
      "semi": ["error", "always"],
      "quotes": ["error", "double", { avoidEscape: true }],
    },
  },
  {
    // Overrides for test files
    files: ["**/*.test.{js,jsx,ts,tsx}", "**/__tests__/**/*"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
