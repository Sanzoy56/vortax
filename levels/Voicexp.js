'use strict';
const { addExp, addCoins } = require('./levels');
const M = require('./maintenance');

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

        const prog = await getProgConfig();

        // Membres actifs : non-bot, pas sanctionné par un modo (serverMute/serverDeaf)
        // selfMute et selfDeaf sont ignorés — se muter soi-même ne pénalise pas
        const actifs = [...channel.members.values()].filter(m =>
          !m.user.bot &&
          !m.voice.serverMute &&
          !m.voice.serverDeaf
        );

        // Minimum de personnes requis (configurable depuis le dashboard, défaut = 1)
        const minUsers = prog.voc_min_users ?? 1;
        if (actifs.length < minUsers) continue;
        const expMin   = prog.voc_exp_min   ?? VOCAL_DEFAULTS.MIN_EXP;
        const expMax   = prog.voc_exp_max   ?? VOCAL_DEFAULTS.MAX_EXP;
        const coinsMin = prog.voc_coins_min ?? VOCAL_DEFAULTS.MIN_COINS;
        const coinsMax = prog.voc_coins_max ?? VOCAL_DEFAULTS.MAX_COINS;

        const { updateQuestProgress } = require('./quests');

        const expOk    = !M.isActive('exp');
        const coinsOk  = !M.isActive('economie');
        for (const member of actifs) {
          const baseExp   = Math.floor(Math.random() * (expMax   - expMin   + 1) + expMin);
          const baseCoins = Math.floor(Math.random() * (coinsMax - coinsMin + 1) + coinsMin);
          if (expOk)   await addExp(member, client, baseExp).catch(() => {});
          if (coinsOk) addCoins(member.id, baseCoins);
          await updateQuestProgress(guild, member.id, 'vocal_min', 1).catch(() => {});
        }
      }
    }
  }, 60_000);
}

module.exports = { startVoiceXp: startVoicexp };
// test