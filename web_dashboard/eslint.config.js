import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default withVueTs(
    {
        scriptLangs: ['ts', 'js']
    },
    {
        ignores: ['dist/**', 'dist-ssr/**', 'coverage/**']
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,tsx,vue}'],
        ...js.configs.recommended,
        rules: {
            ...js.configs.recommended.rules,
            // These rules joined the recommended set after ESLint 8.
            'preserve-caught-error': 'off',
            'no-useless-assignment': 'off'
        }
    },
    pluginVue.configs['flat/essential'],
    vueTsConfigs.eslintRecommended,
    {
        files: ['**/*.{ts,mts,tsx}'],
        languageOptions: {
            parser: tseslint.parser
        }
    },
    {
        files: ['**/*.{ts,mts,tsx,vue}'],
        plugins: {
            '@typescript-eslint': tseslint.plugin
        },
        rules: {
            'no-unused-vars': 'off',
            'no-undef': 'off',
            '@typescript-eslint/no-unused-vars': 'warn'
        }
    },
    {
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            globals: {
                console: 'readonly',
                process: 'readonly'
            }
        }
    },
    skipFormatting
)
