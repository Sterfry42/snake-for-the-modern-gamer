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
      // Allow unused vars with underscore prefix (common in TypeScript)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Warn on unused expressions
      '@typescript-eslint/no-unused-expressions': 'warn',
      // Allow void expressions
      '@typescript-eslint/no-floating-promises': 'off',
      // Allow any for now
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow non-null assertion for now
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Allow console for now
      'no-console': 'warn',
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
];
