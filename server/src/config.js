// Boot-time config. Fails fast if something required is missing.
// Load .env with Node's built-in flag when running: node --env-file=.env src/index.js
const {
  PORT = '4000',
  DB_FILE = './ascend.db',
  NODE_ENV = 'development',
  SESSION_SECRET,
} = process.env;

const isProd = NODE_ENV === 'production';

// In production a real secret is mandatory; in dev we fall back with a loud warning.
let sessionSecret = SESSION_SECRET;
if (!sessionSecret) {
  if (isProd) throw new Error('SESSION_SECRET is required in production.');
  sessionSecret = 'dev-insecure-secret-change-me';
  console.warn('[config] SESSION_SECRET not set — using an insecure dev default.');
}

export const config = {
  port: Number(PORT),
  dbFile: DB_FILE,
  isProd,
  sessionSecret,
  sessionTtlMs: 1000 * 60 * 60 * 24 * 7, // 7 days
  cookieName: 'ascend_sid',
};

// Validate early so a bad env crashes at boot, not mid-request.
if (!Number.isFinite(config.port)) {
  throw new Error(`Invalid PORT: ${PORT}`);
}
