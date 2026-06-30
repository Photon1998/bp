const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');
const path = require('path');

const app = express();
const PORT = 3000;

// Manually proxy /api/bpwatcher/* with correct headers
app.use('/api/bpwatcher', (req, res) => {
  const url = `https://177321.xyz${req.originalUrl}`;
  const options = {
    method: req.method,
    headers: {
      'accept': 'application/json, */*',
      'referer': 'https://177321.xyz/',
      'origin': 'https://177321.xyz',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  };
  const proxy = https.request(url, options, (upstream) => {
    res.status(upstream.statusCode);
    res.set('content-type', upstream.headers['content-type'] || 'application/json');
    upstream.pipe(res);
  });
  proxy.on('error', (err) => res.status(502).json({ error: err.message }));
  proxy.end();
});

// Proxy /api/backpack/* → Backpack Exchange API
app.use('/api/backpack', createProxyMiddleware({
  target: 'https://api.backpack.exchange',
  changeOrigin: true,
  pathRewrite: { '^/api/backpack': '' },
}));

// Serve static files (index.html, assets/, data/)
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`BP 質押率監控 running at http://localhost:${PORT}`);
});
