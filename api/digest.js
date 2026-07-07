const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: {
        accept: 'application/json, */*',
        referer: 'https://177321.xyz/',
        origin: 'https://177321.xyz',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('content-type', 'application/json');

  try {
    const d = await fetchJSON('https://177321.xyz/api/bpwatcher/live-staking-summary');

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 未來 24 小時解鎖事件
    const upcomingUnlocks = (d.liveUnlockEvents || []).filter(e => {
      const t = new Date(e.unlockAt);
      return t >= now && t <= in24h;
    });
    const totalUnlock24h = upcomingUnlocks.reduce((s, e) => s + e.amountBp, 0);

    const totalStaked = d.latestRecord?.totalStakedBp ?? 0;

    // 質押率：取 rateSeries 最後一點
    const latestRate = d.rateSeries?.at(-1);
    const stakedPct = latestRate ? +(latestRate.stakedPct * 100).toFixed(4) : null;

    const s = d.stakingSummary || {};

    // 拋壓等級
    const unlockRatio = totalStaked > 0 ? totalUnlock24h / totalStaked : 0;
    const pressureLevel = unlockRatio >= 0.005 ? 'high' : unlockRatio >= 0.001 ? 'medium' : 'low';

    // 趨勢
    const trend = s.delta1h > 100 ? 'increasing' : s.delta1h < -100 ? 'decreasing' : 'flat';

    const digest = {
      generatedAt: d.generatedAt,
      totalStakedBp: Math.round(totalStaked),
      stakedPct,
      netChange: {
        '1h': Math.round(s.delta1h ?? 0),
        '4h': Math.round(s.delta4h ?? 0),
        '24h': Math.round(s.delta24h ?? 0),
      },
      unstake: {
        '1h': Math.round(s.unstake1h ?? 0),
        '4h': Math.round(s.unstake4h ?? 0),
        '24h': Math.round(s.unstake24h ?? 0),
      },
      trend,
      upcomingUnlocks24h: upcomingUnlocks.map(e => ({
        unlockAt: e.unlockAt,
        amountBp: Math.round(e.amountBp),
      })),
      totalUpcomingUnlock24h: Math.round(totalUnlock24h),
      pressureLevel,
      tweetHints: {
        zh: buildZhHint({ totalStaked, stakedPct, s, totalUnlock24h, trend, pressureLevel }),
        en: buildEnHint({ totalStaked, stakedPct, s, totalUnlock24h, trend, pressureLevel }),
      },
    };

    res.statusCode = 200;
    res.end(JSON.stringify(digest, null, 2));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: err.message }));
  }
};

function fmt(n) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

function buildZhHint({ totalStaked, stakedPct, s, totalUnlock24h, trend, pressureLevel }) {
  const trendZh = trend === 'increasing' ? '📈 持續增加' : trend === 'decreasing' ? '📉 持續減少' : '➡️ 持平';
  const pressureZh = pressureLevel === 'high' ? '⚠️ 高' : pressureLevel === 'medium' ? '🟡 中等' : '🟢 低';
  return [
    `📊 #BP 質押監控 (${new Date().toISOString().slice(0,10)})`,
    `質押總量：${fmt(totalStaked)} BP${stakedPct != null ? `（佔比 ${stakedPct}%）` : ''}`,
    `近 1h 淨變化：${s.delta1h >= 0 ? '+' : ''}${fmt(s.delta1h ?? 0)} BP　趨勢：${trendZh}`,
    `24h 解鎖拋壓：${fmt(totalUnlock24h)} BP　風險：${pressureZh}`,
    `#Backpack #質押率`,
  ].join('\n');
}

function buildEnHint({ totalStaked, stakedPct, s, totalUnlock24h, trend, pressureLevel }) {
  const trendEn = trend === 'increasing' ? '📈 Rising' : trend === 'decreasing' ? '📉 Falling' : '➡️ Flat';
  const pressureEn = pressureLevel === 'high' ? '⚠️ High' : pressureLevel === 'medium' ? '🟡 Medium' : '🟢 Low';
  return [
    `📊 #BP Staking Update (${new Date().toISOString().slice(0,10)})`,
    `Total staked: ${fmt(totalStaked)} BP${stakedPct != null ? ` (${stakedPct}%)` : ''}`,
    `1h net change: ${s.delta1h >= 0 ? '+' : ''}${fmt(s.delta1h ?? 0)} BP  Trend: ${trendEn}`,
    `24h unlock pressure: ${fmt(totalUnlock24h)} BP  Risk: ${pressureEn}`,
    `#Backpack #Staking`,
  ].join('\n');
}
