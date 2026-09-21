import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // .agents holds vendored agent tooling (browser automation scripts and a
  // bundled UMD build) that is not part of the app and is not written against
  // these rules, so it is kept out of the lint run.
  { ignores: ['dist/**', 'node_modules/**', '.agents/**'] },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Hook dependency mistakes are the easiest way to reintroduce stale-closure
      // bugs in the microphone loop, so they fail the build instead of warning.
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/test-setup.ts', 'src/test-support/**'],
    languageOptions: {
      globals: { ...globals.vitest },
    },
  },
)
