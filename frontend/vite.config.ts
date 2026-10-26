import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.data/**', '**/uploads/**', '**/.models/**', '**/.venv/**'] },
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
