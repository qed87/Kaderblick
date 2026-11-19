import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import neverthrow from 'eslint-plugin-neverthrow';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      // Das Plugin nutzt noch die Rule-API von ESLint 8 (context.getScope, context.parserServices).
      neverthrow: fixupPluginRules(neverthrow),
    },
    rules: {
      'neverthrow/must-use-result': 'error',
      'no-console': 'error',
      // Fastify-Plugins sind per Konvention async, auch ohne await.
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['test/**/*.ts', 'features/**/*.ts'],
    rules: {
      // Tests prüfen Results gezielt mit _unsafeUnwrapErr, isErr usw.; das Plugin kennt nur
      // match, unwrapOr und _unsafeUnwrap als Behandlung.
      'neverthrow/must-use-result': 'off',
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            { from: 'package', package: 'node:test', name: ['describe', 'it', 'suite', 'test'] },
          ],
        },
      ],
    },
  },
);
