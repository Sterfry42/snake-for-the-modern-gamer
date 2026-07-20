/**
 * Reusable linting rules for detecting unused code.
 *
 * This module exports a centralized configuration that can be imported
 * into eslint.config.js and referenced in CI/CD pipelines.
 *
 * Usage:
 *   1. ESLint: Import rules into eslint.config.js
 *   2. CLI: Run `npm run lint:unused` for a focused report
 *   3. CI: Add `npm run lint:unused:ci` to your pipeline
 *
 * What it catches:
 *   - Unused imports (no-unused-imports)
 *   - Unused variables, parameters, and function arguments (no-unused-vars)
 *   - Unused local declarations (via TypeScript's noUnusedLocals)
 *   - Unused function parameters (via TypeScript's noUnusedParameters)
 *   - Potentially unused exports (via separate analysis script)
 *   - Potentially unused files (via separate analysis script)
 *
 * Patterns:
 *   - Variables prefixed with `_` are allowed (common TypeScript convention)
 *   - Catch clause variables prefixed with `_` are allowed
 *   - Function arguments prefixed with `_` are allowed
 */

export const unusedCodeRules = {
  /**
   * ESLint rule: Catch unused imports from modules.
   * Example: `import { unused } from './module'`
   */
  'no-unused-imports': 'error' as const,

  /**
   * ESLint rule: Catch unused variables, parameters, and function arguments.
   * Allows underscore-prefixed names to follow TypeScript conventions.
   * Example: `const _ignored = compute();` (allowed)
   * Example: `const unused = compute();` (error)
   */
  'no-unused-vars': [
    'error' as const,
    {
      args: 'after-used',
      argsIgnorePattern: '^_',
      caughtErrors: 'all' as const,
      caughtErrorsIgnorePattern: '^_',
      destructurePatternIgnorePattern: '^_',
      ignoreRestSiblings: true,
      vars: 'all' as const,
      varsIgnorePattern: '^_',
    },
  ] as const,

  /**
   * ESLint rule: Warn on unused expressions (side-effect-free).
   * Example: `1 + 1;` (warning — likely a mistake)
   */
  'no-unused-expressions': ['warn' as const, { allowShortCircuit: true }] as const,
} as const;

/**
 * CLI scripts for unused code detection.
 * These can be added to package.json scripts:
 *
 *   "lint:unused": "eslint src/ --rule 'no-unused-imports: error' --rule 'no-unused-vars: error'",
 *   "lint:unused:ci": "npm run lint -- --max-warnings 0",
 *   "lint:unused-exports": "node scripts/check-unused-exports.mjs",
 *   "lint:unused-files": "node scripts/check-unused-files.mjs",
 */
export const lintingScripts = {
  /** Focused lint run for unused code only */
  lintUnused: 'eslint src/ --rule "no-unused-imports:error" --rule "no-unused-vars:error"',
  /** CI-friendly version with zero warnings */
  lintUnusedCI: 'npm run lint -- --max-warnings 0',
  /** Check for unused exports */
  checkUnusedExports: 'node scripts/check-unused-exports.mjs',
  /** Check for unused source files */
  checkUnusedFiles: 'node scripts/check-unused-files.mjs',
} as const;

export default unusedCodeRules;
