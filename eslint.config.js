// Lint rules for the site. Run: npm run lint
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  {
    // The pages' scripts: classic browser scripts that share window globals.
    files: ["*.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser, google: "readonly" } },
  },
  {
    // Node scripts, tests and config files (ES modules).
    files: ["scripts/**/*.mjs", "tests/**/*.{js,mjs}", "eslint.config.js", "playwright.config.js"],
    languageOptions: { sourceType: "module", globals: globals.node },
  },
  {
    rules: {
      // Drawing helpers share one (colour, outline, options) signature even when they don't use all of it.
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      // Saving to localStorage is best effort: an empty catch means "carry on without it".
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
