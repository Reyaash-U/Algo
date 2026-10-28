import dotenv from 'dotenv';
dotenv.config();

const NODE_ENV = process.env.NODE_ENV ?? 'development';

// Fail fast at boot if required config is missing. Better a loud crash on
// startup than a confusing 500 three screens deep.
// `fallback` is only ever used outside production — a real deploy with a
// missing secret must crash, not silently start with a guessable default.
function required(key, fallback) {
  const val = process.env[key] ?? (NODE_ENV === 'production' ? undefined : fallback);
  if (val === undefined) {
    // eslint-disable-next-line no-console
    console.error(`[env] Missing required env var: ${key}`);
    process.exit(1);
  }
  return val;
}

export const env = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT ?? '5000', 10),

  DATABASE_URL: required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/algovault'),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
  ACCESS_TTL: process.env.ACCESS_TTL ?? '15m',
  REFRESH_TTL: process.env.REFRESH_TTL ?? '7d',

  // Comma-separated list of allowed frontend origins, e.g.
  // "http://localhost:5173,https://algovault.vercel.app"
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Feature flag: when true, unimplemented endpoints return mock data.
  // Backend Dev flips this off per-feature as real services land.
  ENABLE_STUBS: (process.env.ENABLE_STUBS ?? 'true') === 'true',

  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true', // true for port 465

  // Public URL of the web app, used for links inside emails.
  APP_URL: (process.env.APP_URL ?? (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').split(',')[0]).trim().replace(/\/$/, ''),

  // SameSite for the refresh cookie: 'strict' (default) when frontend and API share a site,
  // 'none' when they are on different domains (e.g. Vercel frontend + Render API).
  COOKIE_SAMESITE: ['strict', 'lax', 'none'].includes(process.env.COOKIE_SAMESITE) ? process.env.COOKIE_SAMESITE : 'strict',

  // OAuth client ID for "Sign in with Google" (Google Cloud Console -> Credentials). Empty disables it.
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',

  // Cron jobs always run in production; set ENABLE_CRON=true to run them in dev too.
  ENABLE_CRON: process.env.ENABLE_CRON === 'true',
};

export const isDev = env.NODE_ENV === 'development';
