/**
 * Runtime configuration sourced from Vite `VITE_*` env vars.
 * Local values live in `.env.development` (used by `vite dev` only), so a
 * production build never ships a localhost URL.
 */

const env = import.meta.env;
const DEFAULT_ADHAR_UI_URL = "https://ui.adhar.io/";

/** Public URL of the Adhar UI app. Defaults to the production app URL. */
export const ADHAR_UI_URL: string =
  ((env.VITE_ADHAR_UI_URL as string | undefined) || DEFAULT_ADHAR_UI_URL).trim() || DEFAULT_ADHAR_UI_URL;
