import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['.vite/**', 'out/**'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.electron,
  importPlugin.flatConfigs.typescript,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { caughtErrors: 'none' },
      ],
      // axios.create() is axios' documented API
      'import/no-named-as-default-member': 'off',
    },
  }
)
