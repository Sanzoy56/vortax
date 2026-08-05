'use strict';
const { QUEST_POOL } = require('./ConfigQuests');
const { getUser, saveUser, today } = require('./db');
const { levelFromExp, handleLevelUp } = require('./levels');
const { getConfig } = require('../config');

const QUESTS_PER_DAY = 10;

function pickRandomQuest(excludeIds) {
  const pool = QUEST_POOL.filter(q => !excludeIds.includes(q.id));
  if (pool.length === 0) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return { ...pool[idx], progress: 0, completed: false, rewarded: false };
}

function generateDailyQuests(user) {
  // Ne génère un lot QUE si l'utilisateur n'a jamais eu de quêtes
  // (plus de reset quotidien — le renouvellement se fait quête par quête)
  if (user.quests?.list?.length > 0) return;

  const pool     = [...QUEST_POOL];
  const selected = [];
  while (selected.length < QUESTS_PER_DAY && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }

  if (!user.quests) user.quests = {};
  user.quests.date = today();
  user.quests.list = selected.map(q => ({
    ...q,
    progress:  0,
    completed: false,
    rewarded:  false,
  }));
}

async function updateQuestProgress(guild, userId, type, amount = 1) {
  const user = getUser(userId);
  generateDailyQuests(user);

  const levelBefore = levelFromExp(user.exp);

  const completed = [];
  const replacements = [];

  for (let i = 0; i < user.quests.list.length; i++) {
    const q = user.quests.list[i];
    if (q.rewarded || q.type !== type) continue;
    q.progress = Math.min(q.progress + amount, q.target);
    if (q.progress >= q.target && !q.completed) {
      q.completed = true;
      q.rewarded  = true;
      user.exp    += q.rewardExp   || 0;
      user.wallet += q.rewardCoins || 0;
      completed.push(q);

      // ── Remplacement immédiat par une nouvelle quête ──────────────
      const currentIds = user.quests.list.map(x => x.id);
      const fresh = pickRandomQuest(currentIds);
      if (fresh) {
        user.quests.list[i] = fresh;
        replacements.push(fresh);
      }
    }
  }

  const levelAfter = levelFromExp(user.exp);
  saveUser(user);

  if (completed.length && guild) {
    const cfg = await getConfig();
    const channel = guild.channels.cache.get(cfg.quetes);
    if (channel) {
      const { generateQuestCompleteCard } = require('./canvas');
      const { AttachmentBuilder } = require('discord.js');
      const member = await guild.members.fetch(userId).catch(() => null);

      for (let i = 0; i < completed.length; i++) {
        const q = completed[i];
        const next = replacements[i];
        const parts = [];
        if (q.rewardExp)   parts.push(`+${q.rewardExp} EXP`);
        if (q.rewardCoins) parts.push(`+${q.rewardCoins} VTX-Coins`);

        let files = [];
        if (member) {
          const buf = await generateQuestCompleteCard(member, q).catch(() => null);
          if (buf) files = [new AttachmentBuilder(buf, { name: 'quete.png' })];
        }

        const nextLine = next
          ? `\n🔄 Nouvelle quête débloquée : **${next.label}** — ${next.desc}`
          : '';

        await channel.send({
          content: `🎯 <@${userId}> a terminé la quête **${q.label}** ! ${parts.join(' • ')} 🎁${nextLine}`,
          files,
        }).catch(() => {});
      }
    }
  }

  if (levelAfter > levelBefore && guild) {
    try {
      const member = await guild.members.fetch(userId);
      await handleLevelUp(member, guild.client, levelBefore, levelAfter, user);
    } catch (e) {
      console.error('[Quests] Erreur handleLevelUp après récompense :', e.message);
    }
  }
}

module.exports = { generateDailyQuests, updateQuestProgress };