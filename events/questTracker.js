'use strict';
// ============================================================
//  events/questTracker.js — Alimente les quêtes qui dépendent
//  d'events Discord bruts : messages, réactions, pièces jointes,
//  mentions/réponses à un membre d'un certain rang, matinal/noctambule.
//
//  Aucun autre fichier n'appelait updateQuestProgress pour ces types
//  (events/stats.js ne fait que pousser vers le dashboard externe),
//  c'est pour ça que ces quêtes ne progressaient jamais.
//
//  Brancher dans index.js : require('./events/questTracker').init(client);
//  Nécessite les intents : GuildMessages, MessageContent, GuildMessageReactions.
// ============================================================

const { updateQuestProgress } = require('../levels/quests');
const { getUser } = require('../levels/db');
const { levelFromExp } = require('../levels/levels');

function memberLevel(userId) {
  const u = getUser(userId);
  return levelFromExp(u.exp || 0);
}

async function onMessageCreate(message) {
  if (message.author.bot || !message.guild) return;
  const guild  = message.guild;
  const userId = message.author.id;

  // 1. Messages envoyés
  updateQuestProgress(guild, userId, 'messages', 1).catch(() => {});

  // 2. Pièce jointe / image postée
  if (message.attachments.size > 0) {
    updateQuestProgress(guild, userId, 'attachment', 1).catch(() => {});
  }

  // 3. Mention d'un membre — on retient le niveau le plus élevé mentionné
  const mentioned = message.mentions.users.filter(u => !u.bot && u.id !== userId);
  if (mentioned.size > 0) {
    let bestLevel = -1;
    for (const u of mentioned.values()) {
      const lvl = memberLevel(u.id);
      if (lvl > bestLevel) bestLevel = lvl;
    }
    if (bestLevel >= 0) {
      updateQuestProgress(guild, userId, 'mention_rank', 1, { targetLevel: bestLevel }).catch(() => {});
    }
  }

  // 4. Réponse (reply) à un membre d'un certain rang
  if (message.reference?.messageId) {
    try {
      const replied = await message.fetchReference();
      if (replied && !replied.author.bot && replied.author.id !== userId) {
        const lvl = memberLevel(replied.author.id);
        updateQuestProgress(guild, userId, 'reply_rank', 1, { targetLevel: lvl }).catch(() => {});
      }
    } catch {
      // message d'origine supprimé/inaccessible : on ignore silencieusement
    }
  }

  // 5. Matinal / Noctambule (heure du serveur qui fait tourner le bot)
  const hour = new Date().getHours();
  if (hour < 9) {
    updateQuestProgress(guild, userId, 'morning', 1).catch(() => {});
  } else if (hour >= 23) {
    updateQuestProgress(guild, userId, 'night', 1).catch(() => {});
  }
}

async function onReactionAdd(reaction, user) {
  if (user.bot) return;

  // Sur un message pas en cache (souvent le cas pour un vieux message),
  // reaction/message arrivent "partial" : il faut les fetch avant de les lire.
  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
  } catch {
    return; // message supprimé ou inaccessible
  }

  if (!reaction.message.guild) return;
  updateQuestProgress(reaction.message.guild, user.id, 'reactions', 1).catch(() => {});
}

module.exports = {
  init(client) {
    client.on('messageCreate', onMessageCreate);
    client.on('messageReactionAdd', onReactionAdd);
    console.log('[QuestTracker] ✅ Events quêtes chargés (messages, reactions, attachment, mention/reply, morning/night).');
  },
};