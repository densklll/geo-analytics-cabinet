import type { NextConfig } from 'next';

// Браузер ходит в API через тот же origin (/api/*), а Next проксирует запросы
// в backend. Так не нужен CORS и адрес API не зашивается в клиентский бандл.
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const config: NextConfig = {
  output: 'standalone',
  ...(basePath ? { basePath } : {}),
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default config;
