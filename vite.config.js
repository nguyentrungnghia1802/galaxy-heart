import { defineConfig } from 'vite';

const base =
  process.env.VITE_BASE_PATH ??
  (process.env.GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true'
    ? '/galaxy-heart/'
    : './');

export default defineConfig({
  base,
  test: {
    environment: 'node',
  },
});
