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

const LOCAL_FALLBACK_URI = 'mongodb://127.0.0.1:27017/tickline';

/** Production must be configured explicitly; local dev falls back to a local MongoDB. */
const resolveMongoUri = () => {
    const uri = process.env.MONGODB_URI?.trim();
    if (uri) return uri;
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'MONGODB_URI is not set. Add it to your environment (e.g. Vercel → Project → Settings → Environment Variables).'
        );
    }
    logger.warn('database.using_local_fallback', {
        uri: LOCAL_FALLBACK_URI,
        hint: 'Copy .env.example to .env.local and set MONGODB_URI, or run `docker compose up mongo`.',
    });
    return LOCAL_FALLBACK_URI;
};

export const connectToDatabase = async () => {
    const uri = resolveMongoUri();

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
