import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { normalizeBase } from './src/lib/paths.mjs';
import { optionalHttps } from './src/lib/config.mjs';
const env = { ...loadEnv(process.env.NODE_ENV || 'production', process.cwd(), 'PUBLIC_'), ...process.env };
const origin = optionalHttps(env.PUBLIC_SITE_URL, 'PUBLIC_SITE_URL');
if (origin && new URL(origin).pathname !== '/') throw new Error('PUBLIC_SITE_URL must be an origin; put the subpath in PUBLIC_BASE_PATH');
export default defineConfig({ output: 'static', site: origin || undefined, base: normalizeBase(env.PUBLIC_BASE_PATH), trailingSlash: 'never', devToolbar: { enabled: false } });
