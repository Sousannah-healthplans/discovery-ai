const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Use environment variable or fallback to Railway production URL
  const target = process.env.REACT_APP_DISCOVERY_BACKEND || 'https://web-production-c309a.up.railway.app';
  app.use(
    ['/collect', '/api'],
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      logLevel: 'warn'
    })
  );
};


