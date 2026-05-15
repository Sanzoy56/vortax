'use strict';
const { EXP, COINS } = require('./config');
const { addExp, addCoins } = require('./levels');

// ─── Config XP vocal ─────────────────────────────────────────
const VOCAL = {
  INTERVAL_MS:  60_000,   // tick toutes les 60 secondes
  MIN_EXP:      10,       // XP min par tick
  MAX_EXP:      20,       // XP max par tick
  MIN_COINS:    3,        // Coins min par tick
  MAX_COINS:    8,        // Coins max par tick
};

// ─── Démarrer la boucle vocale ───────────────────────────────
function startVoiceXp(client) {
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        // Uniquement les salons vocaux
        if (!channel.isVoiceBased()) continue;

        for (const [memberId, member] of channel.members) {
          // Ignorer les bots
          if (member.user.bot) continue;

          // Ignorer les membres muets ET sourds (AFK)
          if (member.voice.selfDeaf && member.voice.selfMute) continue;

          // XP
          const baseExp = Math.floor(
            Math.random() * (VOCAL.MAX_EXP - VOCAL.MIN_EXP + 1) + VOCAL.MIN_EXP
          );
          await addExp(member, client, baseExp).catch(() => {});

          // Coins
          const baseCoins = Math.floor(
            Math.random() * (VOCAL.MAX_COINS - VOCAL.MIN_COINS + 1) + VOCAL.MIN_COINS
          );
          addCoins(memberId, baseCoins);
        }
      }
    }
  }, VOCAL.INTERVAL_MS);
}

module.exports = { startVoiceXp };