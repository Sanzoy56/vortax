const { QUEST_POOL, QUESTS_PER_DAY, CHANNELS } = require('../config');
const { getUser, saveUser, today } = require('./db');

// ─── Générer les quêtes du jour pour un user ─────────────────
function generateDailyQuests(user) {
  const todayStr = today();
  if (user.quests.date === todayStr) return;

  const pool     = [...QUEST_POOL];
  const selected = [];
  while (selected.length < QUESTS_PER_DAY && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }

  user.quests.date = todayStr;
  user.quests.list = selected.map(q => ({
    ...q,
    progress:  0,
    completed: false,
    rewarded:  false,
  }));
}

// ─── Mettre à jour la progression + récompense automatique ───
async function updateQuestProgress(guild, userId, type, amount = 1) {
  const user = getUser(userId);
  generateDailyQuests(user);

  for (const q of user.quests.list) {
    if (q.rewarded || q.type !== type) continue;

    q.progress = Math.min(q.progress + amount, q.target);

    if (q.progress >= q.target && !q.completed) {
      q.completed = true;
      q.rewarded  = true;

      user.exp    += q.rewardExp   || 0;
      user.wallet += q.rewardCoins || 0;

      // Annonce dans le salon quêtes
      if (guild) {
        const channel = guild.channels.cache.get(CHANNELS.QUETES);
        if (channel) {
          const parts = [];
          if (q.rewardExp)   parts.push(`+${q.rewardExp} EXP`);
          if (q.rewardCoins) parts.push(`+${q.rewardCoins} VTX-Coins`);
          await channel.send(`🎯 <@${userId}> a terminé la quête **${q.label}** ! ${parts.join(' • ')} 🎁`);
        }
      }
    }
  }

  saveUser(user);
}

// ─── Annoncer les quêtes du jour dans le salon (1x/jour) ─────
async function announceQuests(guild, userId) {
  const user = getUser(userId);
  generateDailyQuests(user);
  saveUser(user);

  const channel = guild.channels.cache.get(CHANNELS.QUETES);
  if (!channel) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  const { generateQuests }   = require('./canvas');
  const { AttachmentBuilder } = require('discord.js');

  const buffer     = await generateQuests(member, user.quests.list);
  const attachment = new AttachmentBuilder(buffer, { name: 'quetes.png' });

  await channel.send({
    content: `📋 <@${userId}> voici tes quêtes du jour !`,
    files:   [attachment],
  });
}

module.exports = { generateDailyQuests, updateQuestProgress, announceQuests };