import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// Build output directory
			out: 'build',
			// Precompress static files (gzip/brotli)
			precompress: true
		})
	}
};

export default config;
