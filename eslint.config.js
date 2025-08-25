import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: {
                chrome: 'readonly',
                console: 'readonly',
                document: 'readonly',
                window: 'readonly',
                location: 'readonly',
                indexedDB: 'readonly',
                IDBKeyRange: 'readonly',
                IDBDatabase: 'readonly',
                IDBTransaction: 'readonly',
                IDBObjectStore: 'readonly',
                IDBTransactionMode: 'readonly',
                IDBRequest: 'readonly',
                IDBValidKey: 'readonly',
                IDBCursorDirection: 'readonly',
                IDBIndexParameters: 'readonly',
                IDBIndex: 'readonly',
                HTMLElement: 'readonly',
                HTMLInputElement: 'readonly',
                HTMLButtonElement: 'readonly',
                HTMLSelectElement: 'readonly',
                HTMLCanvasElement: 'readonly',
                HTMLImageElement: 'readonly',
                CanvasRenderingContext2D: 'readonly',
                Element: 'readonly',
                Event: 'readonly',
                EventTarget: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                alert: 'readonly',
                confirm: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
            prettier: prettier,
        },
        rules: {
            ...typescript.configs.recommended.rules,
            ...prettierConfig.rules,
            'prettier/prettier': ['error', { tabWidth: 4 }],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },

    {
        ignores: ['dist/', 'node_modules/', '*.js'],
    },
];
