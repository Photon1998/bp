const http = require('http');
const { URL } = require('url');

module.exports = function handler(req, res) {
  const u = new URL(req.url, 'https://dummy.com');
  const subpath = decodeURIComponent(u.searchParams.get('_p') || '');
  u.searchParams.delete('_p');

  const targetPath = '/api/bpwatcher/' + subpath + u.search;

  const options = {
    hostname: '140.245.127.194',
    port: 3001,
    path: targetPath,
    method: req.method || 'GET',
    headers: { accept: 'application/json' },
    timeout: 10000,
  };

  const proxy = http.request(options, (upstream) => {
    res.statusCode = upstream.statusCode;
    if (upstream.headers['content-type']) res.setHeader('content-type', upstream.headers['content-type']);
    res.setHeader('access-control-allow-origin', '*');
    upstream.pipe(res);
  });

  proxy.on('timeout', () => {
    proxy.destroy();
    res.statusCode = 504;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'VPS timeout' }));
  });

  proxy.on('error', (err) => {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  });

  proxy.end();
};
