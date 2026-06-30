const https = require('https');
const { URL } = require('url');

module.exports = function handler(req, res) {
  const u = new URL(req.url, 'https://dummy.com');
  const subpath = decodeURIComponent(u.searchParams.get('_p') || '');
  u.searchParams.delete('_p');
  const target = new URL('https://177321.xyz/api/bpwatcher/' + subpath + u.search);

  const options = {
    hostname: target.hostname,
    path: target.pathname + target.search,
    method: req.method || 'GET',
    headers: {
      accept: 'application/json, */*',
      referer: 'https://177321.xyz/',
      origin: 'https://177321.xyz',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  };

  const proxy = https.request(options, (upstream) => {
    res.statusCode = upstream.statusCode;
    if (upstream.headers['content-type']) res.setHeader('content-type', upstream.headers['content-type']);
    res.setHeader('access-control-allow-origin', '*');
    upstream.pipe(res);
  });

  proxy.on('error', (err) => {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  });

  proxy.end();
};
