import mongoose from 'mongoose';
import { logger } from '@/lib/logger';

declare global {
    var mongooseCache: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    };
}

let cached = global.mongooseCache;

if (!cached) {
    cached = global.mongooseCache = { conn: null, promise: null };
}

export const connectToDatabase = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI must be set within .env');

    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 8_000,
        });
    }

    try {
        cached.conn = await cached.promise;
        logger.info('database.connected', { env: process.env.NODE_ENV });
    } catch (err) {
        cached.promise = null;
        logger.error('database.connection_failed', { error: err });
        throw err;
    }

    return cached.conn;
};

export const pingDatabase = async (): Promise<boolean> => {
    try {
        const conn = await connectToDatabase();
        await conn.connection.db?.admin().ping();
        return true;
    } catch {
        return false;
    }
};
