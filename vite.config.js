import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: '/',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    server: {
        port: 5176,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false,
            },
        },
        hmr: { overlay: false },
    },
});
