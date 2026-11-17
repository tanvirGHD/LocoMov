import mongoose from 'mongoose';

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error('MONGO_URI is missing. Add a persistent MongoDB connection string to server/.env.');
  }

  try {
    console.log('Connecting to the configured MongoDB database...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
    console.log(`MongoDB connected successfully: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    const reason = error?.code || error?.name || 'UnknownError';
    console.error(`MongoDB connection failed (${reason}). Check Atlas DNS/network access, IP access list, and database user.`);
    throw new Error('Could not connect to the configured MongoDB database. Check Atlas DNS/network access, IP access list, and database user.');
  }
}
