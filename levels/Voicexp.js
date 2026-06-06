'use strict';
const { addExp, addCoins } = require('./levels');

const VOCAL_DEFAULTS = { MIN_EXP: 60, MAX_EXP: 100, MIN_COINS: 1500, MAX_COINS: 3000 };

// ─── Config progression (cache 5 min depuis le dashboard) ────
let _progCache = null, _progFetchedAt = 0;
async function getProgConfig() {
  if (_progCache && Date.now() - _progFetchedAt < 5 * 60 * 1000) return _progCache;
  try {
    const res = await fetch('https://vtx-bot.alwaysdata.net/api/progression');
    _progCache = await res.json();
    _progFetchedAt = Date.now();
  } catch {}
  return _progCache || {};
}

// ─── Démarrer la boucle vocale ───────────────────────────────
function startVoicexp(client) {
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        // Uniquement les salons vocaux
        if (!channel.isVoiceBased()) continue;

        // Membres actifs : non-bot, ni muet (soi-même ou modérateur), ni sourd
        const actifs = [...channel.members.values()].filter(m =>
          !m.user.bot &&
          !m.voice.selfMute &&
          !m.voice.serverMute &&
          !m.voice.selfDeaf &&
          !m.voice.serverDeaf
        );

        // XP seulement si au moins 2 personnes actives dans le salon
        if (actifs.length < 2) continue;

        const prog     = await getProgConfig();
        const expMin   = prog.voc_exp_min   ?? VOCAL_DEFAULTS.MIN_EXP;
        const expMax   = prog.voc_exp_max   ?? VOCAL_DEFAULTS.MAX_EXP;
        const coinsMin = prog.voc_coins_min ?? VOCAL_DEFAULTS.MIN_COINS;
        const coinsMax = prog.voc_coins_max ?? VOCAL_DEFAULTS.MAX_COINS;

        for (const member of actifs) {
          const baseExp   = Math.floor(Math.random() * (expMax   - expMin   + 1) + expMin);
          const baseCoins = Math.floor(Math.random() * (coinsMax - coinsMin + 1) + coinsMin);
          await addExp(member, client, baseExp).catch(() => {});
          addCoins(member.id, baseCoins);
        }
      }
    }
  }, 60_000);
}

module.exports = { startVoiceXp: startVoicexp };
// test