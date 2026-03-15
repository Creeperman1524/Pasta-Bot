import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/test/**/*.test.ts'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1'
	},
	transform: {
		'^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }]
	},
	clearMocks: true
};

export default config;
