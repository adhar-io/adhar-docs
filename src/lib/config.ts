/**
 * Runtime configuration sourced from Vite `VITE_*` env vars.
 * Local values live in `.env.development` (used by `vite dev` only), so a
 * production build never ships a localhost URL.
 */

const env = import.meta.env;

/** Public URL of the Adhar UI app. Unset means the nav link is hidden. */
export const ADHAR_UI_URL: string | undefined = (env.VITE_ADHAR_UI_URL as string | undefined) || undefined;
