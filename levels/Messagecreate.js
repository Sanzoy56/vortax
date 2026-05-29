'use strict';
const { EXP, COINS } = require('./config');
const { getUser, saveUser } = require('./db');
const { addExp, addCoins, resetDailyStatsIfNeeded } = require('./levels');
const { updateQuestProgress, generateDailyQuests } = require('./quests');

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
    await updateQuestProgress(guild, userId, 'streak', user.streak);

    // Quêtes horaires (morning / night)
    if (hour < 8)        await updateQuestProgress(guild, userId, 'morning', 1); // avant 8h  → Lève-tôt
    else if (hour < 9)   await updateQuestProgress(guild, userId, 'morning', 1); // avant 9h  → Matinal
    if (hour >= 23)      await updateQuestProgress(guild, userId, 'night',   1); // après 23h → Noctambule
    if (hour === 0)      await updateQuestProgress(guild, userId, 'night',   1); // minuit    → Nuit blanche

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
    // On passe l'objet user déjà chargé pour éviter un double getUser qui peut écraser lastMessageDate
    if (member) await addExp(member, client, baseExp, user);

    // Quête EXP (XP gagné aujourd'hui)
    await updateQuestProgress(guild, userId, 'exp', baseExp);

    // Coins
    const coinsMin  = prog.msg_coins_min ?? COINS.MIN_PER_MSG;
    const coinsMax  = prog.msg_coins_max ?? COINS.MAX_PER_MSG;
    const baseCoins = Math.floor(Math.random() * (coinsMax - coinsMin + 1)) + coinsMin;
    const gained    = addCoins(userId, baseCoins);

    // CORRIGÉ : 'coins_earned' pour les coins gagnés par messages (pas 'coins')
    await updateQuestProgress(guild, userId, 'coins_earned', gained);
  },
};