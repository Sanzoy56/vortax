'use strict';
// ============================================================
//  events/questVoice.js — Alimente la quête "vocal_min" (temps
//  passé en vocal). Indépendant de events/stats.js, qui ne fait
//  que pousser les sessions vocales vers le dashboard externe.
//
//  Brancher dans index.js : require('./events/questVoice').init(client);
// ============================================================

const { updateQuestProgress } = require('../levels/quests');

const sessions = new Map(); // "guildId:userId" -> { lastFlushed }
let _client = null;

function key(guildId, userId) { return `${guildId}:${userId}`; }

async function onVoiceStateUpdate(oldState, newState) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const guild = newState.guild || oldState.guild;
  const k = key(guild.id, member.id);

  const joined  = !oldState.channelId && newState.channelId;
  const left    = oldState.channelId && !newState.channelId;
  const changed = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

  if (!joined && !left && !changed) return; // mute/deaf etc. → on ignore

  if (joined) {
    sessions.set(k, { lastFlushed: Date.now() });
    return;
  }

  if (changed) {
    // On garde la session ouverte, le changement de salon ne casse pas le comptage
    if (!sessions.has(k)) sessions.set(k, { lastFlushed: Date.now() });
    return;
  }

  if (left) {
    const session = sessions.get(k);
    sessions.delete(k);
    if (!session) return;
    const minutes = Math.floor((Date.now() - session.lastFlushed) / 60000);
    if (minutes > 0) {
      await updateQuestProgress(guild, member.id, 'vocal_min', minutes).catch(() => {});
    }
  }
}

// Toutes les 60s : crédite les minutes écoulées aux membres toujours connectés,
// pour ne pas avoir besoin de quitter le vocal pour que la quête progresse.
function startFlushLoop() {
  setInterval(async () => {
    if (!_client) return;
    const now = Date.now();
    for (const [k, session] of sessions.entries()) {
      const elapsedMin = Math.floor((now - session.lastFlushed) / 60000);
      if (elapsedMin < 1) continue;
      session.lastFlushed = now;
      const [guildId, userId] = k.split(':');
      const guild = _client.guilds.cache.get(guildId);
      if (guild) await updateQuestProgress(guild, userId, 'vocal_min', elapsedMin).catch(() => {});
    }
  }, 60_000);
}

// Initialise les sessions pour les membres déjà en vocal au démarrage du bot
function initExistingSessions(client) {
  const now = Date.now();
  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (!channel.isVoiceBased?.()) continue;
      for (const member of channel.members.values()) {
        if (member.user.bot) continue;
        const k = key(guild.id, member.id);
        if (!sessions.has(k)) sessions.set(k, { lastFlushed: now });
      }
    }
  }
}

module.exports = {
  init(client) {
    _client = client;
    client.on('voiceStateUpdate', onVoiceStateUpdate);
    client.once('ready', () => initExistingSessions(client));
    startFlushLoop();
    console.log('[QuestVoice] ✅ Suivi du temps vocal pour les quêtes chargé.');
  },
};