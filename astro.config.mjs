import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
	integrations: [tailwind()],
	vite: {
		plugins: [VitePWA()],
	},
});