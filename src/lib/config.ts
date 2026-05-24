/**
 * Runtime configuration sourced from Vite `VITE_*` env vars.
 * Override per environment in `.env`, `.env.local`, etc.
 */

const env = import.meta.env;

/** Adhar UI app (the local dev server during development). */
export const ADHAR_UI_URL: string =
  (env.VITE_ADHAR_UI_URL as string | undefined) ?? "http://localhost:5173/";

/** Adhar Console login screen (where Sign In should land). */
export const ADHAR_CONSOLE_LOGIN_URL: string =
  (env.VITE_ADHAR_CONSOLE_LOGIN_URL as string | undefined) ??
  "http://localhost:5100/login";
