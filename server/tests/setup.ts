import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Test environment config (used by auth/jwt during tests).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
process.env.NODE_ENV = 'test';

let mongo: MongoMemoryServer;

// Spin up a fresh in-memory MongoDB before the tests in each file.
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

// Clear all data between tests so they don't leak into each other.
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// Tear everything down.
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
