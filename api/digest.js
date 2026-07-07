const http = require('http');

function fetchVPS() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '140.245.127.194',
      port: 3001,
      path: '/api/summary',
      method: 'GET',
      headers: { accept: 'application/json' },
      timeout: 8000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('content-type', 'application/json');

  try {
    const data = await fetchVPS();
    res.statusCode = 200;
    res.end(JSON.stringify(data, null, 2));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: err.message }));
  }
};
