import mongoose from 'mongoose';
import { DB_NAME } from '../constant.js';

/**
 * Connects to MongoDB database using Mongoose
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      console.warn('⚠️ MONGO_URI is not set in .env. MongoDB connection skipped.');
      return;
    }

    // If mongoUri ends with a slash or doesn't specify a db name, append DB_NAME
    const connectionInstance = await mongoose.connect(
      mongoUri.includes('?') || mongoUri.endsWith(`/${DB_NAME}`)
        ? mongoUri
        : `${mongoUri}/${DB_NAME}`
    );

    console.log(`🍃 MongoDB connected successfully! DB HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('❌ MONGODB Connection FAILED:', error.message);
    process.exit(1);
  }
};

export default connectDB;
