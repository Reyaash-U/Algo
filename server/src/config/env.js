import dotenv from 'dotenv';
dotenv.config();

// Fail fast at boot if required config is missing. Better a loud crash on
// startup than a confusing 500 three screens deep.
function required(key, fallback) {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    // eslint-disable-next-line no-console
    console.error(`[env] Missing required env var: ${key}`);
    process.exit(1);
  }
  return val;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
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
};

export const isDev = env.NODE_ENV === 'development';
