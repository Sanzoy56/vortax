const path = require('path');
const fs   = require('fs');

const LOCAL_CONFIG_PATH = path.join(__dirname, 'config.json');

function getLocalConfig() {
  try { return JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf8')); }
  catch { return {}; }
}

let _cfgCache = null;
let _cfgFetchedAt = 0;
const CFG_TTL = 5 * 60 * 1000; // 5 minutes

async function getConfig() {
  if (_cfgCache && Date.now() - _cfgFetchedAt < CFG_TTL) return _cfgCache;

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000); // timeout 15s (alwaysdata cold start)
  try {
    const res = await fetch('https://vtx-bot.alwaysdata.net/config', { signal: ctrl.signal });
    clearTimeout(timer);
    const cfg = await res.json();
    _cfgCache = cfg;
    _cfgFetchedAt = Date.now();
    return cfg;
  } catch {
    clearTimeout(timer);
    const local = getLocalConfig();
    if (local && Object.keys(local).length > 0) {
      _cfgCache = local;
      _cfgFetchedAt = Date.now();
    }
    return local;
  }
}

module.exports = { getConfig }