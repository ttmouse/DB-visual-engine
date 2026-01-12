import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// Custom Middleware for Volcengine CN to guarantee clean headers (mimicking curls)
const volcengineProxyPlugin = () => {
  return {
    name: 'volcengine-cn-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api/volcengine-cn')) {
          const targetHost = 'ark.cn-beijing.volces.com';
          let targetPath = '';

          if (req.url.startsWith('/api/volcengine-cn-models')) targetPath = '/api/v3/models';
          else if (req.url.startsWith('/api/volcengine-cn-chat')) targetPath = '/api/v3/chat/completions';
          else if (req.url.startsWith('/api/volcengine-cn')) targetPath = '/api/v3/images/generations';

          if (!targetPath) return next();

          console.log(`[Middleware Proxy] ${req.url} -> https://${targetHost}${targetPath}`);

          import('https').then(https => {
            const proxyReq = https.request(`https://${targetHost}${targetPath}`, {
              method: req.method,
              timeout: 300000, // 5 minutes timeout
              headers: {
                // Only pass necessary headers, stripping everything else
                'Authorization': req.headers['authorization'],
                'Content-Type': 'application/json',
                'Host': targetHost,
                'User-Agent': 'curl/8.7.1',
                'Accept': '*/*'
              }
            }, (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
              proxyRes.pipe(res);
            });

            // Handle timeout explicitly
            proxyReq.on('timeout', () => {
              console.error('[Middleware Proxy] Request timeout');
              proxyReq.destroy();
              if (!res.headersSent) {
                res.writeHead(504, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Proxy Request Timeout (Local)' }));
              }
            });

            proxyReq.on('error', (err) => {
              console.error('[Middleware Proxy] Error:', err);
              if (!res.headersSent) {
                // Determine if it was a timeout that caused the error
                const status = (err as any).code === 'ECONNRESET' ? 504 : 502;
                res.writeHead(status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
            });

            if (req.method !== 'GET' && req.method !== 'HEAD') {
              req.pipe(proxyReq);
            } else {
              proxyReq.end();
            }
          });
          return;
        }
        next();
      });
    }
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';

  return {
    server: {
      port: 3005,
      host: '0.0.0.0',
      fs: {
        strict: false,
      },
      proxy: {
        '/api/twitter': {
          target: 'https://api.vxtwitter.com',
          changeOrigin: true,
          secure: false,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          rewrite: (path) => path.replace(/^\/api\/twitter/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('[Twitter Proxy] Requesting:', req.url);
            });
            proxy.on('error', (err, req, res) => {
              console.error('[Twitter Proxy] Error:', err);
            });
          }
        },
        '/api/volcengine-models': {
          target: 'https://ark.ap-southeast.bytepluses.com',
          changeOrigin: true,
          secure: false,
          timeout: 300000,
          proxyTimeout: 300000,
          rewrite: (path) => path.replace(/^\/api\/volcengine-models/, '/api/v3/models'),
        },
        '/api/volcengine-chat': {
          target: 'https://ark.ap-southeast.bytepluses.com',
          changeOrigin: true,
          secure: false,
          timeout: 300000,
          proxyTimeout: 300000,
          rewrite: (path) => path.replace(/^\/api\/volcengine-chat/, '/api/v3/chat/completions'),
        },
        '/api/volcengine': {
          target: 'https://ark.ap-southeast.bytepluses.com',
          changeOrigin: true,
          secure: false,
          timeout: 300000,
          proxyTimeout: 300000,
          rewrite: (path) => path.replace(/^\/api\/volcengine/, '/api/v3/images/generations'),
        }
      }
    },
    plugins: [
      react(),
      volcengineProxyPlugin(), // Use custom middleware
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
          }
        }
      },
      chunkSizeWarningLimit: 1000, // 提高 chunk 大小警告限制
    }
  };
});
