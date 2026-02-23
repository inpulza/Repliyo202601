import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from '@neondatabase/serverless';

const PgStore = connectPgSimple(session);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const sessionStore = new PgStore({
  pool: pool as any,
  tableName: 'session',
  createTableIfMissing: true
});

// Detect if running in Replit (production-like environment with HTTPS)
const isReplit = !!process.env.REPL_ID || !!process.env.REPLIT_DEPLOYMENT;
const isProduction = process.env.NODE_ENV === "production" || isReplit;

const sessionSecret = process.env.SESSION_SECRET;
if (isProduction && !sessionSecret) {
  console.error('[Session] CRITICAL: SESSION_SECRET environment variable is required in production! Using fallback - this is NOT secure.');
}

console.log(`[Session] Config: isReplit=${isReplit}, isProduction=${isProduction}, NODE_ENV=${process.env.NODE_ENV}`);

export const sessionMiddleware = session({
  store: sessionStore,
  secret: sessionSecret || "dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid',
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
    path: '/',
  },
});
