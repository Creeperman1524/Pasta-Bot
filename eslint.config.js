const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
	// Source files — use the main tsconfig (rootDir: src/)
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: './tsconfig.json'
			}
		},
		plugins: {
			'@typescript-eslint': tseslint
		},
		rules: {
			...tseslint.configs.recommended.rules
		}
	},
	// Test files and jest config — use the test tsconfig (rootDir: .)
	{
		files: ['test/**/*.ts', 'jest.config.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: './tsconfig.test.json'
			}
		},
		plugins: {
			'@typescript-eslint': tseslint
		},
		rules: {
			...tseslint.configs.recommended.rules
		}
	},
	{
		ignores: ['dist/**', 'node_modules/**']
	}
];
