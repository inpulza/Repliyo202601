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

export const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
});
