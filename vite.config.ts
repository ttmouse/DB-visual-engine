import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';
  
  return {
    server: {
      port: 3005,
      host: '0.0.0.0',
      proxy: {
        '/api/volcengine-models': {
          target: 'https://ark.ap-southeast.bytepluses.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/volcengine-models/, '/api/v3/models')
        },
        '/api/volcengine-chat': {
          target: 'https://ark.ap-southeast.bytepluses.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/volcengine-chat/, '/api/v3/chat/completions')
        },
        '/api/volcengine': {
          target: 'https://ark.ap-southeast.bytepluses.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/volcengine/, '/api/v3/images/generations')
        }
      }
    },
    plugins: [
      react(),
      // 构建分析插件，仅在构建时启用
      isProduction && visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
    ].filter(Boolean),
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.API_ENDPOINT': JSON.stringify(env.GEMINI_API_ENDPOINT)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // 将第三方库拆分为单独的 chunk
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['lucide-react', 'react-markdown'],
            'utils-vendor': ['idb-keyval'],
            // 按功能模块拆分
            'studio': ['./src/features/studio'],
            'chat': ['./src/features/chat'],
            'history': ['./src/features/history'],
          }
        }
      },
      chunkSizeWarningLimit: 1000, // 提高 chunk 大小警告限制
    }
  };
});
