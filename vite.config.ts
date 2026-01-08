import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3005,
      host: '0.0.0.0',
      proxy: {
        '/api/volcengine': {
          target: 'https://ark.ap-southeast.bytepluses.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/volcengine/, '/api/v3/images/generations')
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.API_ENDPOINT': JSON.stringify(env.GEMINI_API_ENDPOINT)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
