'use strict';
const { QUEST_POOL } = require('./ConfigQuests');
const { getUser, saveUser, today } = require('./db');
const { levelFromExp, handleLevelUp } = require('./levels');

async function getConfig() {
  try {
    const res = await fetch('http://localhost:3001/config')
    return await res.json()
  } catch { return {} }
}

const QUESTS_PER_DAY = 10;

function generateDailyQuests(user) {
  const todayStr = today();
  if (user.quests?.date === todayStr) return;

  const pool     = [...QUEST_POOL];
  const selected = [];
  while (selected.length < QUESTS_PER_DAY && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }

  if (!user.quests) user.quests = {};
  user.quests.date = todayStr;
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

  // ── Phase SYNC : calculer les complétions, modifier user ──────────────
  const completed = [];
  for (const q of user.quests.list) {
    if (q.rewarded || q.type !== type) continue;
    q.progress = Math.min(q.progress + amount, q.target);
    if (q.progress >= q.target && !q.completed) {
      q.completed = true;
      q.rewarded  = true;
      user.exp    += q.rewardExp   || 0;
      user.wallet += q.rewardCoins || 0;
      completed.push(q);
    }
  }

  const levelAfter = levelFromExp(user.exp);

  // SAUVEGARDE AVANT tout await — évite d'écraser des données écrites entre-temps
  saveUser(user);

  // ── Phase ASYNC : notifier (après la sauvegarde) ──────────────────────
  if (completed.length && guild) {
    const cfg = await getConfig();
    const channel = guild.channels.cache.get(cfg.quetes);
    if (channel) {
      for (const q of completed) {
        const parts = [];
        if (q.rewardExp)   parts.push(`+${q.rewardExp} EXP`);
        if (q.rewardCoins) parts.push(`+${q.rewardCoins} VTX-Coins`);
        await channel.send(`🎯 <@${userId}> a terminé la quête **${q.label}** ! ${parts.join(' • ')} 🎁`);
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