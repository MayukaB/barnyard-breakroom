// Lint rules for the site. Run: npm run lint
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "test-results/", "playwright-report/", "public/vendor/"] },
  js.configs.recommended,
  {
    // The pages' scripts: classic browser scripts that share window globals.
    // Account is set by account.js (sign-in, shared by every page); google by Google's sign-in script.
    files: ["public/**/*.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser, google: "readonly", Account: "readonly" } },
  },
  {
    // Node scripts, tests and config files (ES modules).
    files: ["scripts/**/*.mjs", "tests/**/*.{js,mjs}", "eslint.config.js", "playwright.config.js"],
    languageOptions: { sourceType: "module", globals: globals.node },
  },
  {
    // Tests also pass functions to page.evaluate(), which run inside the browser.
    files: ["tests/**/*.{js,mjs}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
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
