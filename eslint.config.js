import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    files: ['src/**/*.ts'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // === UNUSED CODE DETECTION ===
      // Catch unused variables, parameters, and function arguments.
      // Allows underscore-prefixed names (TypeScript convention).
      '@typescript-eslint/no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
        vars: 'all',
        varsIgnorePattern: '^_',
      }],
      // Warn on unused expressions (side-effect-free)
      '@typescript-eslint/no-unused-expressions': 'warn',

      // === PERMISSIVE RULES (for now) ===
      // Allow void expressions
      '@typescript-eslint/no-floating-promises': 'off',
      // Allow any for now
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow non-null assertion for now
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Allow empty blocks
      '@typescript-eslint/no-empty-function': 'off',
      // Allow default parameters
      '@typescript-eslint/default-param-last': 'off',
      // Allow nested ternaries
      'no-nested-ternary': 'off',
      // Allow switch without default
      'default-case': 'off',
      // Require const for non-assignable
      'prefer-const': 'warn',
      // Require let/const
      'no-var': 'error',
    },
  },
  // Allow console in test files
  {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
