// Proxy for Backpack Exchange public API
module.exports = async function handler(req, res) {
  const stripped = req.url.replace(/^\/api\/backpack/, '');
  const target = `https://api.backpack.exchange${stripped}`;
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: { accept: 'application/json' },
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
