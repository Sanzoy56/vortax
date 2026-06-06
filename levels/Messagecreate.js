'use strict';
const { EXP, COINS } = require('./config');
const { getUser, saveUser } = require('./db');
const { addExp, addCoins, resetDailyStatsIfNeeded } = require('./levels');
const { updateQuestProgress, generateDailyQuests } = require('./quests');
const B = require('./buffs');

const cooldowns = new Map();

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

module.exports = {
  name: 'messageCreate',

  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild)      return;

    const userId = message.author.id;
    const now    = Date.now();
    const guild  = message.guild;
    const hour   = new Date().getHours();

    // Toujours compter le message pour les quêtes (pas de cooldown ici)
    const user = getUser(userId);
    generateDailyQuests(user);
    resetDailyStatsIfNeeded(user);
    user.dailyStats.messages++;
    saveUser(user);

    await updateQuestProgress(guild, userId, 'messages', 1);

    // Quêtes horaires (morning / night)
    if (hour < 8)        await updateQuestProgress(guild, userId, 'morning', 1); // avant 8h  → Lève-tôt
    else if (hour < 9)   await updateQuestProgress(guild, userId, 'morning', 1); // avant 9h  → Matinal
    if (hour >= 23)      await updateQuestProgress(guild, userId, 'night',   1); // après 23h → Noctambule
    if (hour === 0)      await updateQuestProgress(guild, userId, 'night',   1); // minuit    → Nuit blanche

    // ── Effets de salon actifs (GUILD_FX) ──────────────────
    const chanId = message.channelId;

    // =lastred : KO 1 min quiconque parle dans le salon (sauf l'activateur)
    const lred = B.getGFX(guild.id, 'lastred');
    if (lred && lred.channel === chanId && lred.userId !== userId) {
      const victim = getUser(userId);
      if (!B.isKOd(victim) && !B.isImmune(victim)) {
        B.setBuff(victim, 'ko', { exp: now + 60_000, from: lred.userId });
        saveUser(victim);
        message.react('💀').catch(() => {});
        return; // bloque aussi les gains
      }
    }

    // Anti-spam cooldown
    const prog     = await getProgConfig();
    const cooldown = prog.msg_cooldown ?? EXP.COOLDOWN_MS;
    const lastGain = cooldowns.get(userId) || 0;
    if (now - lastGain < cooldown) return;
    cooldowns.set(userId, now);

    // EXP
    const expMin  = prog.msg_exp_min   ?? EXP.MIN_PER_MSG;
    const expMax  = prog.msg_exp_max   ?? EXP.MAX_PER_MSG;
    const baseExp = Math.floor(Math.random() * (expMax - expMin + 1)) + expMin;
    const member  = message.member ?? await message.guild.members.fetch(userId).catch(() => null);
    if (member) await addExp(member, client, baseExp);

    // Quête EXP (XP gagné aujourd'hui)
    await updateQuestProgress(guild, userId, 'exp', baseExp);

    // ── Coins : territoire / bluemax interceptent les gains ─
    const coinsMin  = prog.msg_coins_min ?? COINS.MIN_PER_MSG;
    const coinsMax  = prog.msg_coins_max ?? COINS.MAX_PER_MSG;
    const baseCoins = Math.floor(Math.random() * (coinsMax - coinsMin + 1)) + coinsMin;

    const terr = B.getGFX(guild.id, 'territoire');
    const bmax = B.getGFX(guild.id, 'bluemax');
    const interceptor = (terr && terr.channel === chanId && terr.userId !== userId) ? terr
                      : (bmax && bmax.channel === chanId && bmax.userId !== userId) ? bmax
                      : null;

    let gained;
    if (interceptor) {
      // Les coins vont à l'activateur, pas au sender
      gained = addCoins(interceptor.userId, baseCoins);
    } else {
      gained = addCoins(userId, baseCoins);
      await updateQuestProgress(guild, userId, 'coins_earned', gained);
    }
  },
};