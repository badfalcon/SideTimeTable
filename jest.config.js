module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
        }],
      ],
    }],
  },
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/lib/bootstrap.min.js',
    '!src/lib/popper.min.js',
  ],
};
