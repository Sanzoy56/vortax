const path = require('path');
const fs   = require('fs');

const LOCAL_CONFIG_PATH = path.join(__dirname, 'config.json');

function getLocalConfig() {
  try { return JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf8')); }
  catch { return {}; }
}

async function getConfig() {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000); // timeout 15s (alwaysdata cold start)
  try {
    const res = await fetch('https://vtx-bot.alwaysdata.net/config', { signal: ctrl.signal });
    clearTimeout(timer);
    return await res.json();
  } catch {
    clearTimeout(timer);
    return getLocalConfig(); // fallback sur le fichier local
  }
}

module.exports = { getConfig }