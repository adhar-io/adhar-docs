import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:8080')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  MODERATOR_EMAILS: (process.env.MODERATOR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};
