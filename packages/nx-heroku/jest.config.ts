/* eslint-disable */
export default {
  displayName: 'nx-heroku',
  preset: '../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  collectCoverageFrom: ['./src/**/*.(t|j)s'],
  coverageReporters: ['html', ['lcovonly'], 'text'],
};
