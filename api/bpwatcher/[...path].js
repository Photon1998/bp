// Proxy for bpwatcher API — must spoof Referer or the server returns HTML
module.exports = async function handler(req, res) {
  const target = `https://177321.xyz${req.url}`;
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        accept: 'application/json, */*',
        referer: 'https://177321.xyz/',
        origin: 'https://177321.xyz',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const body = await upstream.arrayBuffer();
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('access-control-allow-origin', '*');
    res.send(Buffer.from(body));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
