import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

declare global {
    var mongooseCache: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    }
}

let cached = global.mongooseCache;

if (!cached) {
    cached = global.mongooseCache = { conn: null, promise: null };
}

export const connectToDatabase = async () => {
    // Early check for missing MONGODB_URI
    if (!MONGODB_URI) throw new Error('MONGODB_URI must be set within .env');

    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        const options = {
            bufferCommands: false,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };
        cached.promise = mongoose.connect(MONGODB_URI);

    try {
        cached.conn = await cached.promise;
        console.log(`Connected to database ${process.env.NODE_ENV}`);
    } catch (err) {
        cached.promise = null;
        console.error("MongoDB connection error:", err);
        throw err;
    }

    return cached.conn;
};
