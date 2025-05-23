// jest.setup.js

// This file is run before each test file.

// Clear all mocks before each test to ensure test isolation.
// This is useful if mocks are configured globally or in a way that might leak state between tests.
// However, it's often better to clear mocks specifically within each test file's
// beforeEach or afterEach, especially when mocks are defined per describe block.
// For now, we'll keep this global for simplicity.
// If you find yourself needing more granular control, move jest.clearAllMocks()
// into the beforeEach of your individual test files.

// beforeEach(() => {
//   jest.clearAllMocks();
// });

// You can also add other global setup here, e.g.,
// - Setting up a test database connection if not using jest-mongodb's environment
// - Mocking global objects or functions

// Example: Mocking console.error to avoid polluting test output,
// but still allowing you to check if it was called.
// jest.spyOn(console, 'error').mockImplementation(() => {});
// jest.spyOn(console, 'warn').mockImplementation(() => {});

// If you were using a global in-memory MongoDB setup (not via jest-mongodb preset):
/*
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  console.log(`Jest global setup: MongoDB connected at ${mongoUri}`);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('Jest global setup: MongoDB disconnected and server stopped.');
});
*/

// For now, this file can be simple. The jest.config.js already points to it.
// Most mock clearing will be handled in the test files themselves.
// jest.config.js's setupFilesAfterEnv will execute this file.
console.log('Jest global setup file (jest.setup.js) executed.');
