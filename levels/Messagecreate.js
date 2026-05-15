'use strict';
const { EXP, COINS } = require('./config');
const { getUser, saveUser } = require('./db');
const { addExp, addCoins, resetDailyStatsIfNeeded } = require('./levels');
const { updateQuestProgress, generateDailyQuests } = require('./quests');

const cooldowns = new Map();

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

    // Streak (valeur absolue, pas un incrément)
    const freshUser = getUser(userId);
    await updateQuestProgress(guild, userId, 'streak', freshUser.streak);

    // Quêtes horaires (morning / night)
    if (hour < 8)        await updateQuestProgress(guild, userId, 'morning', 1); // avant 8h  → Lève-tôt
    else if (hour < 9)   await updateQuestProgress(guild, userId, 'morning', 1); // avant 9h  → Matinal
    if (hour >= 23)      await updateQuestProgress(guild, userId, 'night',   1); // après 23h → Noctambule
    if (hour === 0)      await updateQuestProgress(guild, userId, 'night',   1); // minuit    → Nuit blanche

    // Anti-spam cooldown 5s pour XP/coins
    const lastGain = cooldowns.get(userId) || 0;
    if (now - lastGain < EXP.COOLDOWN_MS) return;
    cooldowns.set(userId, now);

    // EXP
    const baseExp = Math.floor(Math.random() * (EXP.MAX_PER_MSG - EXP.MIN_PER_MSG + 1)) + EXP.MIN_PER_MSG;
    const member  = message.member ?? await message.guild.members.fetch(userId).catch(() => null);
    if (member) await addExp(member, client, baseExp);

    // Quête EXP (XP gagné aujourd'hui)
    await updateQuestProgress(guild, userId, 'exp', baseExp);

    // Coins
    const baseCoins = Math.floor(Math.random() * (COINS.MAX_PER_MSG - COINS.MIN_PER_MSG + 1)) + COINS.MIN_PER_MSG;
    const gained    = addCoins(userId, baseCoins);

    // CORRIGÉ : 'coins_earned' pour les coins gagnés par messages (pas 'coins')
    await updateQuestProgress(guild, userId, 'coins_earned', gained);
  },
};