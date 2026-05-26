import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under https://<owner>.github.io/<repo>/, so
// asset URLs must be prefixed with that repo segment in production builds.
// `command === 'serve'` is `vite dev`, where we want a plain `/` base.
//
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/AccessSpec/' : '/',
}));
