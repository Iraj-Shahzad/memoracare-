/**
 * DB CONFIG — establishes the single Mongoose connection to MongoDB.
 *
 * Key concepts: connectDB() awaits mongoose.connect(process.env.MONGODB_URI) and, on failure,
 * process.exit(1) so the app doesn't run without a database; connection-level listeners
 * (connected/disconnected/error) log lifecycle events for observability.
 * Viva line: "The whole app shares one Mongoose connection, and startup aborts if the database is unreachable."
 */
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose connection established');
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose connection disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

export default connectDB;
