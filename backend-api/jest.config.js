module.exports = {
  testEnvironment: 'node', // Using Node.js environment for backend tests
  verbose: true, // Output more information during tests
  collectCoverage: true, // Generate coverage reports
  coverageDirectory: 'coverage', // Directory for coverage reports
  coveragePathIgnorePatterns: [ // Paths to ignore for coverage
    '/node_modules/',
    '/scripts/', // Ignoring seed script for coverage
    '/src/config/', // Ignoring config files for coverage
    '/src/app.js', // Ignoring app setup for unit test coverage (integration tests would cover this)
    '/src/server.js', // Ignoring server start for unit test coverage
  ],
  testMatch: [ // Patterns Jest uses to detect test files
    '**/__tests__/**/*.test.js?(x)', // Standard Jest pattern
    '**/?(*.)+(spec|test).js?(x)',   // Another common pattern
  ],
  // If using @shelf/jest-mongodb and it were compatible, you'd configure it here:
  // preset: '@shelf/jest-mongodb',
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname',
  // ],
  // globalSetup: './path/to/your/globalSetup.js', // if needed for jest-mongodb
  // globalTeardown: './path/to/your/globalTeardown.js', // if needed for jest-mongodb
  setupFilesAfterEnv: ['./jest.setup.js'], // File to run after test framework is installed
};
