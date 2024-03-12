/* eslint-disable */
export default {
  displayName: 'nx-heroku-e2e',
  preset: '../../jest.preset.js',
  globals: {},
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  collectCoverageFrom: ['./src/**/*.(t|j)s'],
  coverageReporters: ['html', ['lcovonly'], 'text'],
};
