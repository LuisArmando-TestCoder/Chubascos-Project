import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextVitals,
  ...nextTs,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'src/scripts/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Underscore-prefixed names are intentionally unused (destructuring out a field).
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
];
