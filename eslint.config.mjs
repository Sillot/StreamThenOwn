import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import regexpPlugin from "eslint-plugin-regexp";

export default tseslint.config(
  // ── Global ignores ────────────────────────────────────────────────
  { ignores: ["dist/**", "node_modules/**", "*.config.{js,mjs,cjs}", "*.config.ts"] },

  // ── Base JS rules ─────────────────────────────────────────────────
  eslint.configs.recommended,

  // ── TypeScript strict + stylistic (type-checked) ──────────────────
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // ── TypeScript parser options ─────────────────────────────────────
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── Custom rules ──────────────────────────────────────────────────
  {
    rules: {
      // Import hygiene
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // Unused vars: allow _-prefixed
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Chrome extension patterns need these relaxed
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        { allowConstantLoopConditions: true },
      ],

      // Disallow any
      "@typescript-eslint/no-explicit-any": "error",

      // Enforce return types on exported functions
      "@typescript-eslint/explicit-module-boundary-types": "error",

      // No floating promises (common bug in extension messaging)
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // Prefer nullish coalescing
      "@typescript-eslint/prefer-nullish-coalescing": "error",

      // General best practices
      "no-console": ["warn", { allow: ["warn", "error", "debug", "group", "groupEnd", "log"] }],
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  // ── DOM security (XSS prevention for content scripts) ─────────────
  {
    plugins: { "no-unsanitized": noUnsanitized },
    rules: {
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
    },
  },

  // ── Regexp safety (ReDoS prevention) ──────────────────────────────
  regexpPlugin.configs["flat/recommended"],

  // ── Prettier compat (must be last) ────────────────────────────────
  eslintConfigPrettier,
);
