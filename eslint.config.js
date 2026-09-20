import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
const { configs } = tsPlugin;
const flatRecommended = configs['flat/recommended'];

export default [
  ...flatRecommended,
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
  },
  // Allow console in test files
  {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
