import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'data/**', 'out/**', 'build/**'],
  },
  {
    // Flat config only matches .js/.mjs/.cjs by default: without this, no component (.jsx) would be linted
    files: ['**/*.{js,jsx,mjs,cjs}'],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Existing alert() calls and empty catch blocks are intentional; keep lint focused on real bugs
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Catch references to variables that no longer exist (e.g. a context value that was renamed)
      'no-undef': 'error',
    },
  },
];

export default eslintConfig;
