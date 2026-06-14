'use strict';
// Salons vocaux "statistiques" : le nom du salon affiche en direct un
// compteur (membres, bots, rôles, salons...). Les salons utilisés pour
// chaque catégorie sont configurables depuis le dashboard (clés
// `stat_channel_<type>` dans la config).

const { getConfig } = require('../config');

const STAT_TYPES = {
  members:  { label: 'Membres',  emoji: '👥' },
  bots:     { label: 'Bots',     emoji: '🤖' },
  online:   { label: 'En ligne', emoji: '🟢' },
  roles:    { label: 'Rôles',    emoji: '🎭' },
  channels: { label: 'Salons',   emoji: '💬' },
};

// Limite Discord : 2 renommages / 10 min par salon.
const UPDATE_INTERVAL_MS = 10 * 60 * 1000;

async function computeStats(guild, mapping) {
  const stats = {};
  if (mapping.members)  stats.members  = guild.memberCount;
  if (mapping.roles)    stats.roles    = guild.roles.cache.size;
  if (mapping.channels) stats.channels = guild.channels.cache.filter(c => c.type !== 4).size; // hors catégories

  if (mapping.bots || mapping.online) {
    const members = await guild.members.fetch({ withPresences: !!mapping.online }).catch(() => null);
    if (members) {
      if (mapping.bots)   stats.bots   = members.filter(m => m.user.bot).size;
      if (mapping.online) stats.online = members.filter(m => !m.user.bot && m.presence?.status && m.presence.status !== 'offline').size;
    }
  }
  return stats;
}

async function updateStatChannels(client) {
  const cfg = await getConfig();

  for (const guild of client.guilds.cache.values()) {
    const mapping = {};
    for (const type of Object.keys(STAT_TYPES)) {
      const channelId = cfg[`stat_channel_${type}`];
      if (channelId) mapping[type] = channelId;
    }
    if (!Object.keys(mapping).length) continue;

    const stats = await computeStats(guild, mapping);
    for (const [type, channelId] of Object.entries(mapping)) {
      if (!(type in stats)) continue;
      const channel = guild.channels.cache.get(channelId);
      if (!channel) continue;
      const def = STAT_TYPES[type];
      const newName = `${def.emoji} ${def.label} : ${stats[type]}`;
      if (channel.name !== newName) {
        await channel.setName(newName).catch(e => console.error('[StatChannels]', e.message));
      }
    }
  }
}

module.exports = {
  init(client) {
    client.once('ready', () => {
      updateStatChannels(client);
      setInterval(() => updateStatChannels(client), UPDATE_INTERVAL_MS);
    });
    console.log('[StatChannels] ✅ Salons statistiques');
  },
};
