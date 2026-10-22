import { defineConfig, loadEnv } from 'vite';
const endpoints = ['store', 'checkout', 'contact', 'order', 'webhook', 'reconcile'];
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    server: { allowedHosts: ['terminal.local'] },
    plugins: [{ name: 'store-api', configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const name = req.url?.split('?')[0].replace(/^\/api\//, '');
        if (!req.url?.startsWith('/api/') || !endpoints.includes(name)) return next();
        try { const handler = await import(`./api/${name}.js`); await handler.default(req, res); }
        catch { res.statusCode = 503; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Store service unavailable.' })); }
      });
    } }],
    build: { rollupOptions: { onwarn(warning, warn) { if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) return; warn(warning); } } },
  };
});
