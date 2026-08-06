'use strict';
const { QUEST_POOL } = require('./ConfigQuests');
const { CHANNELS } = require('./config');
const { getUser, saveUser } = require('./db');
const { levelFromExp, handleLevelUp } = require('./levels');

const OPTIONS_PER_SLOT = 3;

// ─── Tirage ────────────────────────────────────────────────────
function randomPick(pool, count, excludeIds = []) {
  const source = pool.filter(q => !excludeIds.includes(q.id));
  const base   = source.length >= count ? source : pool;
  const copy   = [...base];
  const picked = [];
  while (picked.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
}

function freshQuestInstance(q) {
  return { ...q, progress: 0, completed: false, rewarded: false };
}

// Slot 0 — quotidienne : tirée seule, tier 1, pas de choix
function freshDailySlot(excludeIds = []) {
  const pool = QUEST_POOL.filter(q => q.tier === 1);
  const [picked] = randomPick(pool, 1, excludeIds);
  return { role: 'daily', status: 'active', quest: freshQuestInstance(picked) };
}

// Slot 1 — hebdo : tirée seule, tier 2, pas de choix
function freshWeeklySlot(excludeIds = []) {
  const pool = QUEST_POOL.filter(q => q.tier === 2);
  const [picked] = randomPick(pool, 1, excludeIds);
  return { role: 'weekly', status: 'active', quest: freshQuestInstance(picked) };
}

// Slot 2 — à choix : 3 options proposées (tout le pool, tiers confondus),
// le joueur en sélectionne une via le select menu.
function freshChoiceSlot(excludeIds = []) {
  const options = randomPick(QUEST_POOL, OPTIONS_PER_SLOT, excludeIds).map(q => ({ ...q }));
  return { role: 'choice', status: 'choice', options };
}

function freshSlots(excludeIds = []) {
  const daily = freshDailySlot(excludeIds);
  const usedAfterDaily = [...excludeIds, daily.quest.id];

  const weekly = freshWeeklySlot(usedAfterDaily);
  const usedAfterWeekly = [...usedAfterDaily, weekly.quest.id];

  const choice = freshChoiceSlot(usedAfterWeekly);

  return [daily, weekly, choice];
}

function ensureQuestSlots(user) {
  if (!user.quests) user.quests = {};
  const slots = user.quests.slots;
  const rolesOk = Array.isArray(slots) && slots.length === 3
    && slots[0]?.role === 'daily' && slots[1]?.role === 'weekly' && slots[2]?.role === 'choice';

  if (!rolesOk) {
    user.quests.slots   = freshSlots();
    user.quests.tracked = {};
  }
  if (!user.quests.tracked) user.quests.tracked = {};
}

// Compat : l'ancien code appelait generateDailyQuests(user)
function generateDailyQuests(user) {
  ensureQuestSlots(user);
}

// Réinitialise complètement les 3 slots (utilisé par =resetquetes)
function resetQuestSlots(user) {
  user.quests = user.quests || {};
  user.quests.slots   = freshSlots();
  user.quests.tracked = {};
}

// Le joueur choisit une des 3 quêtes proposées pour le slot "à choix".
function chooseQuest(user, slotIndex, questId) {
  ensureQuestSlots(user);
  const slot = user.quests.slots[slotIndex];
  if (!slot || slot.role !== 'choice' || slot.status !== 'choice') return null;
  const picked = slot.options.find(o => o.id === questId);
  if (!picked) return null;

  user.quests.slots[slotIndex] = { role: 'choice', status: 'active', quest: freshQuestInstance(picked) };
  saveUser(user);
  return picked;
}

function matchQuest(q, type, meta) {
  if (q.type !== type) return false;
  if (q.minRankLevel && (!meta || (meta.targetLevel ?? -1) < q.minRankLevel)) return false;
  return true;
}

// ── Envoie la carte "quête terminée" dans le salon quêtes ──────
async function notifyQuestsCompleted(guild, userId, completedQuests) {
  if (!guild || !completedQuests.length) return;
  try {
    const { generateQuestCompleteCard } = require('./canvas');
    const { AttachmentBuilder } = require('discord.js');
    const { getConfig } = require('../config');

    const cfg          = await getConfig().catch(() => ({}));
    const questChannel = guild.channels.cache.get(cfg.quetes) || guild.channels.cache.get(CHANNELS.QUETES);
    if (!questChannel) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    for (const quest of completedQuests) {
      const buf   = await generateQuestCompleteCard(member, quest).catch(e => {
        console.error('[Quests] Erreur génération carte quête :', e.message);
        return null;
      });
      const files = buf ? [new AttachmentBuilder(buf, { name: 'quete.png' })] : [];
      await questChannel.send({
        content: `🎯 <@${userId}> a terminé la quête **${quest.label}** !`,
        files,
      }).catch(() => {});
    }
  } catch (e) {
    console.error('[Quests] Erreur notifyQuestsCompleted :', e.message);
  }
}

async function updateQuestProgress(guild, userId, type, amount = 1, meta = null) {
  const user = getUser(userId);
  ensureQuestSlots(user);

  const levelBefore = levelFromExp(user.exp);
  const justCompleted = []; // quêtes qui viennent d'être terminées PENDANT cet appel

  for (const slot of user.quests.slots) {
    if (slot.status !== 'active') continue;
    const q = slot.quest;
    if (q.rewarded || !matchQuest(q, type, meta)) continue;

    if (q.uniqueTrack) {
      if (!user.quests.tracked[q.id]) user.quests.tracked[q.id] = [];
      const arr = user.quests.tracked[q.id];
      const key = meta?.uniqueKey;
      if (key && !arr.includes(key)) arr.push(key);
      q.progress = Math.min(arr.length, q.target);
    } else {
      q.progress = Math.min((q.progress || 0) + amount, q.target);
    }

    if (q.progress >= q.target && !q.completed) {
      q.completed = true;
      q.rewarded  = true;
      user.exp    += q.rewardExp   || 0;
      user.wallet += q.rewardCoins || 0;
      justCompleted.push({ ...q });
    }
  }

  // Reset silencieux : dès que les 3 slots (quotidienne + hebdo + choix
  // sélectionnée) sont complétés, on retire 3 nouvelles quêtes. La quotidienne
  // et l'hebdo sont retirées automatiquement, le slot à choix repasse en mode
  // sélection avec 3 nouvelles options. Aucun message envoyé pour le RESET
  // (mais chaque quête individuelle a déjà été notifiée ci-dessous).
  const [daily, weekly, choice] = user.quests.slots;
  const allDone =
    daily?.status === 'active'  && daily.quest.completed &&
    weekly?.status === 'active' && weekly.quest.completed &&
    choice?.status === 'active' && choice.quest.completed;

  if (allDone) {
    const usedIds = [daily.quest.id, weekly.quest.id, choice.quest.id];
    user.quests.slots   = freshSlots(usedIds);
    user.quests.tracked = {};
  }

  const levelAfter = levelFromExp(user.exp);
  saveUser(user);

  // ── Notif "quête terminée" dans le salon quêtes (style carte niveau/rang) ──
  if (justCompleted.length) {
    await notifyQuestsCompleted(guild, userId, justCompleted);
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

module.exports = {
  generateDailyQuests, ensureQuestSlots, resetQuestSlots, chooseQuest, updateQuestProgress,
};