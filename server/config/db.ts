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
