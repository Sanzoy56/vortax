const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Stocké en dehors du repo : un git pull/reset/clean (sync auto GitHub
// Desktop sur la box) supprime les fichiers non trackés du repo.
const DATA_DIR = path.join(__dirname, '..', 'vortax-data');
const GIVEAWAYS_FILE = path.join(DATA_DIR, 'giveaways.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Migration : si l'ancien giveaways.json (dans le repo) existe encore et que
// le nouveau n'existe pas, on le déplace vers son nouvel emplacement.
const OLD_GIVEAWAYS_FILE = path.join(__dirname, 'giveaways.json');
if (!fs.existsSync(GIVEAWAYS_FILE) && fs.existsSync(OLD_GIVEAWAYS_FILE)) {
  fs.copyFileSync(OLD_GIVEAWAYS_FILE, GIVEAWAYS_FILE);
}

console.log(`[Giveaway] Données stockées dans : ${GIVEAWAYS_FILE}`);

const E = {
  gift:    '<a:4748blobgift:1513971386455167166>',
  trophy:  '<a:7356_trophy:1513971834373275708>',
  time:    '<:81973time:1513973081498980392>',
  check:   '<a:85322greencheck1:1513974036982665359>',
  purple:  '<a:checkpurple1:1513974998057095268>',
  members: '<:928205membericon:1513980909580320838>',
  alarm:   '<a:1558alarm:1513982112863092806>',
  crown:   '<a:905668crown:1513982366266167326>',
  cross:   '<:26643crossmark:1510067005066055690>',
  boost:   '<a:21025boosterbadgerolling:1513976050063773889>',
  volume:  '<:83570screensharevolumemax:1513975720710373546>',
  ticking: '<:44294ticking:1513976303634874449>',
};

// ─────────────────────────────────────────────────────────────
//  Fichier
// ─────────────────────────────────────────────────────────────
function loadGiveaways() {
  if (!fs.existsSync(GIVEAWAYS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(GIVEAWAYS_FILE, 'utf8')); }
  catch { return {}; }
}
function saveGiveaways(data) {
  fs.writeFileSync(GIVEAWAYS_FILE, JSON.stringify(data, null, 2));
}
function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(match[1]) * multipliers[match[2]];
}

// ─────────────────────────────────────────────────────────────
//  Builders d'embeds
// ─────────────────────────────────────────────────────────────
function conditionsValue(gw) {
  return [
    `• ${E.purple} Rôle requis : ${gw.requiredRole ? `<@&${gw.requiredRole}>` : '**aucun**'}`,
    `• ${E.ticking} Messages minimum : **${gw.messagesMin > 0 ? gw.messagesMin : 'aucun'}**`,
    `• ${E.volume} Minutes vocal minimum : **${gw.vocalMin > 0 ? gw.vocalMin : 'aucun'}**`,
    `• ${E.boost} Rôle bypass : ${gw.bypassRole ? `<@&${gw.bypassRole}>` : '**aucun**'}`,
    `• ${E.alarm} Temps pour claim : **${gw.claimMinutes > 0 ? gw.claimMinutes + ' minutes' : 'aucun'}**`,
  ].join('\n');
}

function participantsValue(gw) {
  const count = (gw.participants || []).length;
  return [
    `• ${E.members} Participants : **${count}**`,
    `• ${E.cross} Rôle blacklist : ${gw.blacklistRole ? `<@&${gw.blacklistRole}>` : '**aucun**'}`,
    `• ${E.boost} Bypass claim : ${gw.bypassRole ? `Oui (rôle : <@&${gw.bypassRole}>)` : '**Non**'}`,
    `• ${E.crown} Hôte : <@${gw.hostId}>`,
  ].join('\n');
}

// Thumbnail par défaut = gift emoji animé depuis Discord CDN → force l'embed à pleine largeur
const DEFAULT_THUMBNAIL = 'https://cdn.discordapp.com/emojis/1513971386455167166.gif';

function applyThumbnail(embed, gw) {
  embed.setThumbnail(gw.image || DEFAULT_THUMBNAIL);
  return embed;
}

function buildActiveEmbed(gw) {
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('Giveaway')
    .setDescription([
      `${E.gift} **Lot :** ${gw.lot}`,
      `${E.trophy} **Gagnants :** ${gw.winners}`,
      `${E.time} **Fin :** <t:${Math.floor(gw.endsAt / 1000)}:R>`,
    ].join('\n'))
    .addFields(
      { name: 'Conditions & options', value: conditionsValue(gw) },
      { name: '​',               value: participantsValue(gw) },
    )
    .setFooter({ text: `Lancé par ${gw.hostTag}` })
    .setTimestamp(new Date(gw.endsAt));
  return applyThumbnail(embed, gw);
}

function buildEndEmbed(gw, winners, claimed = []) {
  let resultValue;
  if (winners.length > 0) {
    const lines = [`• ${E.trophy} Gagnant(s) : ${winners.map(w => `<@${w}>`).join(', ')}`];
    if (gw.claimMinutes > 0) {
      lines.push(`• ${E.check} Claimé(s) : ${claimed.length ? claimed.map(w => `<@${w}>`).join(', ') : '**aucun**'}`);
    }
    resultValue = lines.join('\n');
  } else {
    resultValue = `• ${E.cross} Aucun participant éligible`;
  }

  const embed = new EmbedBuilder()
    .setColor(winners.length > 0 ? '#FFD700' : '#FF0000')
    .setTitle('Giveaway')
    .setDescription([
      `${E.gift} **Lot :** ${gw.lot}`,
      `${E.trophy} **Gagnants :** ${gw.winners}`,
      `${E.time} **Fin :** <t:${Math.floor(gw.endsAt / 1000)}:R>`,
      `${E.check} **Terminé**`,
    ].join('\n'))
    .addFields(
      { name: 'Conditions & options', value: conditionsValue(gw) },
      { name: '​',               value: participantsValue(gw) },
      { name: 'Résultat',             value: resultValue },
    )
    .setFooter({ text: `Lancé par ${gw.hostTag}` })
    .setTimestamp();
  return applyThumbnail(embed, gw);
}

// ─────────────────────────────────────────────────────────────
//  Éligibilité
// ─────────────────────────────────────────────────────────────
async function pickEligibles(gw, channel, now = Date.now()) {
  let eligibles = [...(gw.participants || [])];

  if (gw.messagesMin > 0) {
    const counts = gw.messageCounts || {};
    eligibles = eligibles.filter(id => (counts[id] || 0) >= gw.messagesMin);
  }

  if (gw.vocalMin > 0) {
    const voiceMins  = gw.voiceMins  || {};
    const voiceJoins = gw.voiceJoins || {};
    eligibles = eligibles.filter(id => {
      let mins = voiceMins[id] || 0;
      if (voiceJoins[id]) mins += (now - voiceJoins[id]) / 60000;
      return mins >= gw.vocalMin;
    });
  }

  if (gw.requiredRole || gw.blacklistRole) {
    const guild    = channel.guild;
    const filtered = [];
    for (const userId of eligibles) {
      try {
        const member = await guild.members.fetch(userId);
        if (gw.blacklistRole && member.roles.cache.has(gw.blacklistRole)) continue;
        if (gw.requiredRole) {
          const bypass = gw.bypassRole && member.roles.cache.has(gw.bypassRole);
          if (!bypass && !member.roles.cache.has(gw.requiredRole)) continue;
        }
        filtered.push(userId);
      } catch {}
    }
    eligibles = filtered;
  }

  return eligibles;
}

// ─────────────────────────────────────────────────────────────
//  Phase de claim
// ─────────────────────────────────────────────────────────────
async function startClaimPhase(client, messageId, channelId, winners) {
  const giveaways = loadGiveaways();
  const gw = giveaways[messageId];
  if (!gw) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const claimMs = gw.claimMinutes * 60 * 1000;
  const claimBtn = new ButtonBuilder()
    .setCustomId(`giveaway_claim_${messageId}`)
    .setLabel('Claim')
    .setEmoji({ id: '1513974036982665359', name: '85322greencheck1', animated: true })
    .setStyle(ButtonStyle.Success);

  const claimMsg = await channel.send({
    content: `${E.crown} ${winners.map(w => `<@${w}>`).join(', ')} — vous avez **${gw.claimMinutes} minute(s)** pour claim **${gw.lot}** !`,
    components: [new ActionRowBuilder().addComponents(claimBtn)],
  }).catch(() => null);

  if (claimMsg) {
    giveaways[messageId].claimMsgId    = claimMsg.id;
    giveaways[messageId].claimDeadline = Date.now() + claimMs;
    saveGiveaways(giveaways);
  }

  setTimeout(() => resolveClaimPhase(client, messageId, channelId), claimMs);
}

async function resolveClaimPhase(client, messageId, channelId) {
  const giveaways = loadGiveaways();
  const gw = giveaways[messageId];
  if (!gw || !gw.claimActive) return;

  const claimed   = gw.claimed || [];
  const winners   = gw.winnersPicked || [];
  const unclaimed = winners.filter(w => !claimed.includes(w));

  const rerolled = [];
  if (unclaimed.length > 0) {
    const pool     = (gw.participants || []).filter(id => !winners.includes(id));
    const shuffled = pool.sort(() => Math.random() - 0.5);
    for (let i = 0; i < unclaimed.length && i < shuffled.length; i++) {
      rerolled.push(shuffled[i]);
    }
  }

  const finalWinners = [...claimed, ...rerolled];
  gw.claimActive  = false;
  gw.ended        = true;
  gw.winnersFinal = finalWinners;
  saveGiveaways(giveaways);

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  if (gw.claimMsgId) {
    const cm = await channel.messages.fetch(gw.claimMsgId).catch(() => null);
    if (cm) await cm.delete().catch(() => {});
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (message) {
    await message.edit({ embeds: [buildEndEmbed(gw, finalWinners, claimed)], components: [] }).catch(() => {});
  }

  if (rerolled.length > 0) {
    await channel.send(
      `${E.crown} **Reroll !** ${rerolled.map(w => `<@${w}>`).join(', ')} remplace(nt) les non-claimeurs. Félicitations ! ${E.gift}`
    ).catch(() => {});
  } else if (finalWinners.length > 0) {
    await channel.send(
      `${E.crown} Félicitations ${finalWinners.map(w => `<@${w}>`).join(', ')} ! Vous avez gagné **${gw.lot}** ! ${E.gift}`
    ).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────
//  Fin du giveaway
// ─────────────────────────────────────────────────────────────
async function endGiveaway(client, messageId, channelId) {
  const giveaways = loadGiveaways();
  const gw = giveaways[messageId];
  if (!gw || gw.ended || gw.claimActive) return;

  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) { gw.ended = true; saveGiveaways(giveaways); return; }

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) { gw.ended = true; saveGiveaways(giveaways); return; }

    const eligibles = await pickEligibles(gw, channel);

    if (eligibles.length === 0) {
      await message.edit({ embeds: [buildEndEmbed(gw, [], [])], components: [] });
      await channel.send(`${E.cross} Le giveaway **${gw.lot}** est terminé mais aucun participant n'est éligible.`);
      gw.ended = true;
      saveGiveaways(giveaways);
      return;
    }

    const shuffled = eligibles.sort(() => Math.random() - 0.5);
    const winners  = shuffled.slice(0, Math.min(gw.winners, eligibles.length));
    gw.winnersPicked = winners;
    gw.claimed = [];

    if (gw.claimMinutes > 0) {
      gw.claimActive = true;
      saveGiveaways(giveaways);
      await message.edit({ embeds: [buildEndEmbed(gw, winners, [])], components: [] });
      await startClaimPhase(client, messageId, channelId, winners);
    } else {
      await message.edit({ embeds: [buildEndEmbed(gw, winners, [])], components: [] });
      await channel.send(
        `${E.crown} Félicitations ${winners.map(w => `<@${w}>`).join(', ')} ! Vous avez gagné **${gw.lot}** ! ${E.gift}`
      );
      gw.ended = true;
      saveGiveaways(giveaways);
    }
  } catch (err) {
    console.error('[Giveaway] Erreur fin giveaway :', err);
  }
}

// ─────────────────────────────────────────────────────────────
//  Export
// ─────────────────────────────────────────────────────────────
module.exports = (client) => {

  // ── Restauration des timers au démarrage ──────────────────
  client.once('ready', () => {
    const giveaways = loadGiveaways();
    const now = Date.now();
    for (const [messageId, gw] of Object.entries(giveaways)) {
      if (gw.ended) continue;
      if (gw.claimActive) {
        const remaining = Math.max((gw.claimDeadline || 0) - now, 0);
        setTimeout(() => resolveClaimPhase(client, messageId, gw.channelId), remaining);
        continue;
      }
      const remaining = gw.endsAt - now;
      if (remaining <= 0) endGiveaway(client, messageId, gw.channelId);
      else setTimeout(() => endGiveaway(client, messageId, gw.channelId), remaining);
    }
  });

  // ── Filet de sécurité : vérifie toutes les 30s les giveaways en retard ──
  // Couvre les cas où le setTimeout initial est perdu (mise en veille du PC,
  // redémarrage non détecté...). endGiveaway/resolveClaimPhase sont sans
  // effet si le giveaway est déjà terminé, donc pas de double traitement.
  setInterval(() => {
    const giveaways = loadGiveaways();
    const now = Date.now();
    for (const [messageId, gw] of Object.entries(giveaways)) {
      if (gw.ended) continue;
      if (gw.claimActive) {
        if ((gw.claimDeadline || 0) <= now) resolveClaimPhase(client, messageId, gw.channelId);
        continue;
      }
      if (gw.endsAt <= now) endGiveaway(client, messageId, gw.channelId);
    }
  }, 30_000);

  // ── Comptage des messages ─────────────────────────────────
  client.on('messageCreate', msg => {
    if (msg.author.bot || !msg.guild) return;
    const giveaways = loadGiveaways();
    let changed = false;
    for (const gw of Object.values(giveaways)) {
      if (gw.ended || gw.claimActive) continue;
      if (!gw.messagesMin || gw.messagesMin <= 0) continue;
      if (gw.guildId !== msg.guild.id) continue;
      if (!gw.messageCounts) gw.messageCounts = {};
      gw.messageCounts[msg.author.id] = (gw.messageCounts[msg.author.id] || 0) + 1;
      changed = true;
    }
    if (changed) saveGiveaways(giveaways);
  });

  // ── Tracking vocal ────────────────────────────────────────
  client.on('voiceStateUpdate', (oldState, newState) => {
    const giveaways = loadGiveaways();
    let changed = false;
    const now     = Date.now();
    const userId  = newState.member?.id || oldState.member?.id;
    const guildId = newState.guild?.id  || oldState.guild?.id;
    if (!userId || !guildId) return;

    for (const gw of Object.values(giveaways)) {
      if (gw.ended || gw.claimActive) continue;
      if (!gw.vocalMin || gw.vocalMin <= 0) continue;
      if (gw.guildId !== guildId) continue;
      if (!gw.voiceJoins) gw.voiceJoins = {};
      if (!gw.voiceMins)  gw.voiceMins  = {};

      if (!oldState.channel && newState.channel) {
        gw.voiceJoins[userId] = now;
        changed = true;
      } else if (oldState.channel && !newState.channel && gw.voiceJoins[userId]) {
        gw.voiceMins[userId] = (gw.voiceMins[userId] || 0) + (now - gw.voiceJoins[userId]) / 60000;
        delete gw.voiceJoins[userId];
        changed = true;
      }
    }
    if (changed) saveGiveaways(giveaways);
  });

  // ── Interactions ──────────────────────────────────────────
  client.on('interactionCreate', async (interaction) => {

    // ── /giveaway ────────────────────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'giveaway') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Admins uniquement.', ephemeral: true });

      const lot           = interaction.options.getString('lot');
      const dureeStr      = interaction.options.getString('durée');
      const nbGagnants    = interaction.options.getInteger('gagnants');
      const hote          = interaction.options.getUser('hote');
      const messagesActif = interaction.options.getBoolean('messages_actif');
      const vocalActif    = interaction.options.getBoolean('vocal_actif');
      const claimMinutes  = interaction.options.getInteger('claim');
      const roleRequis    = interaction.options.getRole('role');
      const roleBlack     = interaction.options.getRole('role_blacklist');
      const roleBypass    = interaction.options.getRole('role_bypass');
      const messagesVal   = interaction.options.getInteger('messages');
      const vocalVal      = interaction.options.getInteger('vocal');
      const imageUrl      = interaction.options.getString('image');

      // Validation messages / vocal
      if (messagesActif && !messagesVal)
        return interaction.reply({ content: '❌ Tu as activé les messages minimum mais tu n\'as pas précisé le nombre (option `messages`).', ephemeral: true });
      if (vocalActif && !vocalVal)
        return interaction.reply({ content: '❌ Tu as activé le vocal minimum mais tu n\'as pas précisé le nombre de minutes (option `vocal`).', ephemeral: true });

      const duree = parseDuration(dureeStr);
      if (!duree) return interaction.reply({ content: '❌ Durée invalide. Format : `10m`, `2h`, `1d`', ephemeral: true });

      // @everyone = pas de restriction
      const everyoneId = interaction.guildId;
      const requiredRole  = roleRequis?.id !== everyoneId  ? roleRequis?.id  : null;
      const blacklistRole = roleBlack?.id  !== everyoneId  ? roleBlack?.id   : null;
      const bypassRole    = roleBypass?.id !== everyoneId  ? roleBypass?.id  : null;

      const gw = {
        lot,
        winners:       nbGagnants,
        endsAt:        Date.now() + duree,
        guildId:       interaction.guildId,
        channelId:     interaction.channelId,
        hostId:        hote.id,
        hostTag:       hote.tag,
        requiredRole,
        blacklistRole,
        bypassRole,
        messagesMin:   messagesActif ? messagesVal : 0,
        vocalMin:      vocalActif    ? vocalVal    : 0,
        claimMinutes,
        image:         imageUrl || null,
        participants:  [],
        messageCounts: {},
        voiceMins:     {},
        voiceJoins:    {},
        ended:         false,
        claimActive:   false,
        winnersPicked: [],
        claimed:       [],
      };

      const button = new ButtonBuilder()
        .setCustomId('giveaway_participer')
        .setLabel('Participer')
        .setEmoji({ id: '1513971386455167166', name: '4748blobgift', animated: true })
        .setStyle(ButtonStyle.Primary);

      await interaction.reply({ content: '✅ Giveaway lancé !', ephemeral: true });
      const msg = await interaction.channel.send({
        embeds: [buildActiveEmbed(gw)],
        components: [new ActionRowBuilder().addComponents(button)],
      });

      const giveaways = loadGiveaways();
      giveaways[msg.id] = gw;
      saveGiveaways(giveaways);
      setTimeout(() => endGiveaway(client, msg.id, interaction.channelId), duree);
    }

    // ── Bouton Participer ────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'giveaway_participer') {
      const giveaways = loadGiveaways();
      const gw = giveaways[interaction.message.id];

      if (!gw || gw.ended || gw.claimActive || Date.now() >= gw.endsAt) {
        await interaction.message.edit({ components: [] }).catch(() => {});
        return interaction.reply({ content: '❌ Ce giveaway est terminé.', ephemeral: true });
      }

      const userId = interaction.user.id;

      if (gw.participants.includes(userId)) {
        gw.participants = gw.participants.filter(id => id !== userId);
        saveGiveaways(giveaways);
        await interaction.update({ embeds: [buildActiveEmbed(gw)] });
        return interaction.followUp({ content: `${E.cross} Tu t'es retiré du giveaway.`, ephemeral: true });
      }

      if (gw.blacklistRole) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member?.roles.cache.has(gw.blacklistRole))
          return interaction.reply({ content: `${E.cross} Tu ne peux pas participer à ce giveaway.`, ephemeral: true });
      }

      if (gw.requiredRole) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const bypass = gw.bypassRole && member?.roles.cache.has(gw.bypassRole);
        if (!bypass && !member?.roles.cache.has(gw.requiredRole))
          return interaction.reply({ content: `${E.cross} Tu dois avoir le rôle <@&${gw.requiredRole}> pour participer !`, ephemeral: true });
      }

      gw.participants.push(userId);
      saveGiveaways(giveaways);
      await interaction.update({ embeds: [buildActiveEmbed(gw)] });
      return interaction.followUp({ content: `${E.check} Tu participes au giveaway ! Bonne chance ${E.gift}`, ephemeral: true });
    }

    // ── Bouton Claim ─────────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith('giveaway_claim_')) {
      const messageId = interaction.customId.replace('giveaway_claim_', '');
      const giveaways = loadGiveaways();
      const gw = giveaways[messageId];

      if (!gw || !gw.claimActive)
        return interaction.reply({ content: '❌ Cette phase de claim est terminée.', ephemeral: true });

      const userId = interaction.user.id;
      if (!gw.winnersPicked.includes(userId))
        return interaction.reply({ content: `${E.cross} Tu n'es pas gagnant de ce giveaway.`, ephemeral: true });
      if (gw.claimed.includes(userId))
        return interaction.reply({ content: `${E.check} Tu as déjà claimé ta récompense !`, ephemeral: true });

      gw.claimed.push(userId);
      saveGiveaways(giveaways);

      const mainMsg = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (mainMsg) {
        await mainMsg.edit({ embeds: [buildEndEmbed(gw, gw.winnersPicked, gw.claimed)] }).catch(() => {});
      }

      return interaction.reply({
        content: `${E.check} Récompense claimée ! L'hôte <@${gw.hostId}> va te contacter.`,
        ephemeral: true,
      });
    }
  });
};
