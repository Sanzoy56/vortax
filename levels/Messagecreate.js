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

    // Toujours compter le message pour les quêtes
    const user = getUser(userId);
    generateDailyQuests(user);
    resetDailyStatsIfNeeded(user);
    user.dailyStats.messages++;
    saveUser(user);
    await updateQuestProgress(guild, userId, 'messages', 1);
    await updateQuestProgress(guild, userId, 'streak',   1);

    // Anti-spam cooldown pour XP/coins
    const lastGain = cooldowns.get(userId) || 0;
    if (now - lastGain < EXP.COOLDOWN_MS) return;
    cooldowns.set(userId, now);

    // EXP
    const baseExp = Math.floor(Math.random() * (EXP.MAX_PER_MSG - EXP.MIN_PER_MSG + 1)) + EXP.MIN_PER_MSG;
    const member  = message.member || await message.guild.members.fetch(userId).catch(() => null);
    if (member) await addExp(member, client, baseExp);

    // Coins
    const baseCoins = Math.floor(Math.random() * (COINS.MAX_PER_MSG - COINS.MIN_PER_MSG + 1)) + COINS.MIN_PER_MSG;
    const gained    = addCoins(userId, baseCoins);
    await updateQuestProgress(guild, userId, 'coins', gained);
    await updateQuestProgress(guild, userId, 'exp',   baseExp);
  },
};