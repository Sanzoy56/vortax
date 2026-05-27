'use strict';
const { EXP, COINS } = require('./config');
const { addExp, addCoins } = require('./levels');

// ─── Config XP vocal ─────────────────────────────────────────
const VOCAL = {
  INTERVAL_MS:  60_000,   // tick toutes les 60 secondes
  MIN_EXP:      60,       // XP min par tick
  MAX_EXP:      100,      // XP max par tick
  MIN_COINS:    200,      // Coins min par tick
  MAX_COINS:    350,      // Coins max par tick
};

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

        for (const member of actifs) {
          const baseExp = Math.floor(
            Math.random() * (VOCAL.MAX_EXP - VOCAL.MIN_EXP + 1) + VOCAL.MIN_EXP
          );
          await addExp(member, client, baseExp).catch(() => {});

          const baseCoins = Math.floor(
            Math.random() * (VOCAL.MAX_COINS - VOCAL.MIN_COINS + 1) + VOCAL.MIN_COINS
          );
          addCoins(member.id, baseCoins);
        }
      }
    }
  }, VOCAL.INTERVAL_MS);
}

module.exports = { startVoiceXp: startVoicexp };
// test