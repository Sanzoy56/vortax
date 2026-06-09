const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

const GIVEAWAYS_FILE = './giveaways.json';

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
//  Helpers fichier
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
function conditionLines(gw) {
  return [
    `> ${gw.requiredRole ? `${E.purple} **Rôle requis :** <@&${gw.requiredRole}>` : `${E.check} **Rôle requis :** aucun`}`,
    gw.blacklistRole ? `> ${E.cross} **Rôle blacklist :** <@&${gw.blacklistRole}>` : null,
    gw.bypassRole    ? `> ${E.boost} **Rôle bypass :** <@&${gw.bypassRole}>` : null,
    gw.messagesMin   ? `> ${E.ticking} **Messages minimum :** ${gw.messagesMin}` : null,
    gw.claimMinutes  ? `> ${E.alarm} **Temps pour claim :** ${gw.claimMinutes} min` : null,
  ].filter(Boolean).join('\n');
}

function buildActiveEmbed(gw) {
  return new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('Giveaway')
    .setDescription([
      `${E.gift} **Lot :** ${gw.lot}`,
      `${E.trophy} **Gagnants :** ${gw.winners}`,
      `${E.time} **Fin :** <t:${Math.floor(gw.endsAt / 1000)}:R>`,
      ``,
      `**Conditions & options**`,
      conditionLines(gw),
      ``,
      `> ${E.members} **Participants :** ${(gw.participants || []).length}`,
      `> ${E.crown} **Hôte :** <@${gw.hostId}>`,
    ].join('\n'))
    .setFooter({ text: `Lancé par ${gw.hostTag}` })
    .setTimestamp(new Date(gw.endsAt));
}

function buildEndEmbed(gw, winners, claimed = []) {
  const hasClaim = gw.claimMinutes > 0;
  const resultLines = winners.length > 0
    ? [
        `> ${E.trophy} **Gagnant(s) :** ${winners.map(w => `<@${w}>`).join(', ')}`,
        hasClaim ? `> ${E.check} **Claimés :** ${claimed.length ? claimed.map(w => `<@${w}>`).join(', ') : 'aucun'}` : null,
      ].filter(Boolean).join('\n')
    : `> ${E.cross} **Aucun participant éligible**`;

  return new EmbedBuilder()
    .setColor(winners.length > 0 ? '#FFD700' : '#FF0000')
    .setTitle('Giveaway')
    .setDescription([
      `${E.gift} **Lot :** ${gw.lot}`,
      `${E.trophy} **Gagnants :** ${gw.winners}`,
      `${E.time} **Fin :** <t:${Math.floor(gw.endsAt / 1000)}:R>`,
      `${E.check} **Terminé**`,
      ``,
      `**Conditions & options**`,
      conditionLines(gw),
      ``,
      `> ${E.members} **Participants :** ${(gw.participants || []).length}`,
      `> ${E.crown} **Hôte :** <@${gw.hostId}>`,
      ``,
      `**Résultat**`,
      resultLines,
    ].join('\n'))
    .setFooter({ text: `Lancé par ${gw.hostTag}` })
    .setTimestamp();
}

// ─────────────────────────────────────────────────────────────
//  Fin du giveaway + système de claim
// ─────────────────────────────────────────────────────────────
async function pickEligibles(gw, channel) {
  let eligibles = [...(gw.participants || [])];

  // Filtre messages minimum
  if (gw.messagesMin > 0) {
    const counts = gw.messageCounts || {};
    eligibles = eligibles.filter(id => (counts[id] || 0) >= gw.messagesMin);
  }

  // Filtre rôle requis / blacklist / bypass
  if (gw.requiredRole || gw.blacklistRole) {
    const guild = channel.guild;
    const filtered = [];
    for (const userId of eligibles) {
      try {
        const member = await guild.members.fetch(userId);
        if (gw.blacklistRole && member.roles.cache.has(gw.blacklistRole)) continue;
        if (gw.requiredRole) {
          const hasBypass = gw.bypassRole && member.roles.cache.has(gw.bypassRole);
          if (!hasBypass && !member.roles.cache.has(gw.requiredRole)) continue;
        }
        filtered.push(userId);
      } catch {}
    }
    eligibles = filtered;
  }

  return eligibles;
}

async function startClaimPhase(client, giveaways, messageId, channelId, winners) {
  const gw = giveaways[messageId];
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const claimMs = gw.claimMinutes * 60 * 1000;
  const claimBtn = new ButtonBuilder()
    .setCustomId(`giveaway_claim_${messageId}`)
    .setLabel('Claim')
    .setEmoji({ id: '1513974036982665359', name: '85322greencheck1', animated: true })
    .setStyle(ButtonStyle.Success);

  const claimMsg = await channel.send({
    content: `${E.crown} ${winners.map(w => `<@${w}>`).join(', ')} vous avez **${gw.claimMinutes} minute(s)** pour claim le lot **${gw.lot}** !`,
    components: [new ActionRowBuilder().addComponents(claimBtn)],
  }).catch(() => null);

  if (claimMsg) {
    gw.claimMsgId = claimMsg.id;
    gw.claimDeadline = Date.now() + claimMs;
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

  // Reroll les non-claimeurs
  const rerolled = [];
  if (unclaimed.length > 0) {
    const eligible = (gw.participants || []).filter(id => !winners.includes(id));
    const shuffled = eligible.sort(() => Math.random() - 0.5);
    for (let i = 0; i < unclaimed.length && i < shuffled.length; i++) {
      rerolled.push(shuffled[i]);
    }
  }

  const finalWinners = [...claimed, ...rerolled];

  // Fermer la phase de claim
  gw.claimActive = false;
  gw.ended = true;
  gw.winnersFinal = finalWinners;
  saveGiveaways(giveaways);

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  // Effacer le message de claim
  if (gw.claimMsgId) {
    const claimMsg = await channel.messages.fetch(gw.claimMsgId).catch(() => null);
    if (claimMsg) await claimMsg.delete().catch(() => {});
  }

  // Mettre à jour l'embed principal
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (message) {
    await message.edit({ embeds: [buildEndEmbed(gw, finalWinners, claimed)], components: [] }).catch(() => {});
  }

  if (rerolled.length > 0) {
    await channel.send(`${E.crown} Reroll ! ${rerolled.map(w => `<@${w}>`).join(', ')} remplace(nt) les non-claimeurs. Félicitations !`).catch(() => {});
  } else if (finalWinners.length > 0) {
    await channel.send(`${E.crown} Félicitations ${finalWinners.map(w => `<@${w}>`).join(', ')} ! Vous avez gagné **${gw.lot}** ! ${E.gift}`).catch(() => {});
  }
}

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
      await channel.send(`${E.cross} Le giveaway **${gw.lot}** est terminé mais personne n'est éligible !`);
      gw.ended = true; saveGiveaways(giveaways);
      return;
    }

    const shuffled = eligibles.sort(() => Math.random() - 0.5);
    const winners  = shuffled.slice(0, Math.min(gw.winners, eligibles.length));

    gw.winnersPicked = winners;
    gw.claimed = [];

    if (gw.claimMinutes > 0) {
      // Phase de claim : pas encore "ended", on attend les claims
      gw.claimActive = true;
      saveGiveaways(giveaways);
      await message.edit({ embeds: [buildEndEmbed(gw, winners, [])], components: [] });
      await startClaimPhase(client, giveaways, messageId, channelId, winners);
    } else {
      // Pas de claim → terminé directement
      await message.edit({ embeds: [buildEndEmbed(gw, winners, [])], components: [] });
      await channel.send(`${E.crown} Félicitations ${winners.map(w => `<@${w}>`).join(', ')} ! Vous avez gagné **${gw.lot}** ! ${E.gift}`);
      gw.ended = true; saveGiveaways(giveaways);
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
        const remaining = (gw.claimDeadline || 0) - now;
        const delay = remaining > 0 ? remaining : 0;
        setTimeout(() => resolveClaimPhase(client, messageId, gw.channelId), delay);
        continue;
      }

      const remaining = gw.endsAt - now;
      if (remaining <= 0) {
        endGiveaway(client, messageId, gw.channelId);
      } else {
        setTimeout(() => endGiveaway(client, messageId, gw.channelId), remaining);
      }
    }
  });

  // ── Comptage des messages (pour messagesMin) ──────────────
  client.on('messageCreate', msg => {
    if (msg.author.bot || !msg.guild) return;
    const giveaways = loadGiveaways();
    let changed = false;
    for (const gw of Object.values(giveaways)) {
      if (gw.ended || gw.claimActive) continue;
      if (!gw.messagesMin || gw.messagesMin <= 0) continue;
      if (!gw.messageCounts) gw.messageCounts = {};
      gw.messageCounts[msg.author.id] = (gw.messageCounts[msg.author.id] || 0) + 1;
      changed = true;
    }
    if (changed) saveGiveaways(giveaways);
  });

  // ── Interactions ──────────────────────────────────────────
  client.on('interactionCreate', async (interaction) => {

    // ── /giveaway ────────────────────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'giveaway') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins uniquement.', ephemeral: true });
      }

      const lot          = interaction.options.getString('lot');
      const dureeStr     = interaction.options.getString('durée');
      const nbGagnants   = interaction.options.getInteger('gagnants');
      const roleRequis   = interaction.options.getRole('role');
      const roleBlack    = interaction.options.getRole('role_blacklist');
      const roleBypass   = interaction.options.getRole('role_bypass');
      const messagesMin  = interaction.options.getInteger('messages') || 0;
      const claimMinutes = interaction.options.getInteger('claim')    || 0;

      const duree = parseDuration(dureeStr);
      if (!duree) return interaction.reply({ content: '❌ Durée invalide. Format : `10m`, `2h`, `1d`', ephemeral: true });

      const endsAt = Date.now() + duree;
      const gw = {
        lot,
        winners:       nbGagnants,
        endsAt,
        channelId:     interaction.channelId,
        hostId:        interaction.user.id,
        hostTag:       interaction.user.tag,
        requiredRole:  roleRequis  ? roleRequis.id  : null,
        blacklistRole: roleBlack   ? roleBlack.id   : null,
        bypassRole:    roleBypass  ? roleBypass.id  : null,
        messagesMin,
        claimMinutes,
        participants:  [],
        messageCounts: {},
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

      // Désistement
      if (gw.participants.includes(userId)) {
        gw.participants = gw.participants.filter(id => id !== userId);
        saveGiveaways(giveaways);
        await interaction.update({ embeds: [buildActiveEmbed(gw)] });
        return interaction.followUp({ content: `${E.cross} Tu t'es retiré du giveaway.`, ephemeral: true });
      }

      // Vérif blacklist
      if (gw.blacklistRole) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member?.roles.cache.has(gw.blacklistRole))
          return interaction.reply({ content: `${E.cross} Tu ne peux pas participer à ce giveaway.`, ephemeral: true });
      }

      // Vérif rôle requis (bypass possible)
      if (gw.requiredRole) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const hasBypass = gw.bypassRole && member?.roles.cache.has(gw.bypassRole);
        if (!hasBypass && !member?.roles.cache.has(gw.requiredRole))
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

      // Mise à jour de l'embed principal
      const channel = interaction.channel;
      const mainMsg = await channel.messages.fetch(messageId).catch(() => null);
      if (mainMsg) await mainMsg.edit({ embeds: [buildEndEmbed(gw, gw.winnersPicked, gw.claimed)] }).catch(() => {});

      return interaction.reply({ content: `${E.check} Récompense claimée ! L'hôte <@${gw.hostId}> va te contacter.`, ephemeral: true });
    }
  });
};
