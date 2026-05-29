'use strict';

// ════════════════════════════════════════════════════════════
//  backup.js — Sauvegarde salons + restauration d'urgence
// ════════════════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const BACKUP_PATH  = path.join(__dirname, '../data/channel_backup.json');
const DELETE_WINDOW = 15_000; // 15s
const DELETE_THRESH = 3;       // 3 suppressions = urgence

// ── State ────────────────────────────────────────────────────
const deleteLog = []; // timestamps de suppressions
let   alertSent = false;

// ════════════════════════════════════════════════════════════
//  Sauvegarde
// ════════════════════════════════════════════════════════════
function serializeChannel(ch) {
  return {
    id:       ch.id,
    name:     ch.name,
    type:     ch.type,
    parentId: ch.parentId || null,
    position: ch.rawPosition,
    topic:    ch.topic || null,
    nsfw:     ch.nsfw || false,
    userLimit: ch.userLimit || 0,
    bitrate:  ch.bitrate || null,
    permissionOverwrites: ch.permissionOverwrites?.cache.map(p => ({
      id:    p.id,
      type:  p.type,
      allow: p.allow.toArray(),
      deny:  p.deny.toArray(),
    })) || [],
  };
}

function saveBackup(guild) {
  const channels = [...guild.channels.cache.values()].map(serializeChannel);
  channels.sort((a, b) => a.position - b.position);
  const data = { guildId: guild.id, savedAt: new Date().toISOString(), channels };
  fs.mkdirSync(path.dirname(BACKUP_PATH), { recursive: true });
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(data, null, 2));
  return channels.length;
}

function loadBackup() {
  if (!fs.existsSync(BACKUP_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8')); }
  catch { return null; }
}

// ════════════════════════════════════════════════════════════
//  Restauration
// ════════════════════════════════════════════════════════════
async function restoreChannels(guild, backup) {
  const created = new Map(); // oldId → newChannel
  const cats    = backup.channels.filter(c => c.type === ChannelType.GuildCategory);
  const rest    = backup.channels.filter(c => c.type !== ChannelType.GuildCategory);

  // Crée les catégories d'abord
  for (const cat of cats.sort((a,b) => a.position - b.position)) {
    try {
      const ch = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        position: cat.position,
        permissionOverwrites: buildPerms(cat.permissionOverwrites, guild),
      });
      created.set(cat.id, ch);
    } catch {}
  }

  // Crée les autres salons
  for (const c of rest.sort((a,b) => a.position - b.position)) {
    try {
      const parent = c.parentId ? (created.get(c.parentId) || guild.channels.cache.get(c.parentId)) : null;
      await guild.channels.create({
        name:     c.name,
        type:     c.type,
        parent:   parent?.id || null,
        topic:    c.topic,
        nsfw:     c.nsfw,
        userLimit: c.userLimit || undefined,
        bitrate:  c.bitrate || undefined,
        position: c.position,
        permissionOverwrites: buildPerms(c.permissionOverwrites, guild),
      });
    } catch {}
  }

  return backup.channels.length;
}

function buildPerms(overwrites, guild) {
  return overwrites.map(p => ({
    id:    p.id,
    type:  p.type,
    allow: p.allow,
    deny:  p.deny,
  })).filter(p => guild.roles.cache.has(p.id) || guild.members.cache.has(p.id) || p.id === guild.id);
}

// ════════════════════════════════════════════════════════════
//  Alerte d'urgence
// ════════════════════════════════════════════════════════════
const ADMIN_CHANNELS = {
  '1360965444974022686': '1415319451729133749',
};
function adminChannel(guild) {
  if (ADMIN_CHANNELS[guild.id]) return guild.channels.cache.get(ADMIN_CHANNELS[guild.id]) || null;
  return guild.channels.cache.find(c => c.isTextBased() && /log|admin|mod|alert|urgence/i.test(c.name));
}

async function sendEmergencyAlert(guild, deleted) {
  if (alertSent) return;
  alertSent = true;
  setTimeout(() => { alertSent = false; }, 60_000); // reset après 1 min

  const ch      = adminChannel(guild);
  if (!ch) return;

  const backup  = loadBackup();
  const backupInfo = backup ? `Sauvegarde du **${new Date(backup.savedAt).toLocaleDateString('fr-FR')}** — ${backup.channels.length} salons` : '❌ Aucune sauvegarde disponible';

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('restore_yes').setLabel('✅ Restaurer les salons').setStyle(ButtonStyle.Success).setDisabled(!backup),
    new ButtonBuilder().setCustomId('restore_no').setLabel('❌ Ignorer').setStyle(ButtonStyle.Secondary),
  );

  const m = await ch.send({
    content: '@here',
    embeds: [new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🚨 URGENCE — Suppression de salons détectée')
      .setDescription([
        `**${deleted}** salons supprimés en moins de **${DELETE_WINDOW/1000}s**`,
        '',
        `📦 ${backupInfo}`,
        '',
        'Voulez-vous restaurer les salons depuis la dernière sauvegarde ?',
      ].join('\n'))
      .setTimestamp()],
    components: [row],
  }).catch(() => null);

  if (!m) return;

  const collector = m.createMessageComponentCollector({ time: 120_000 });
  collector.on('collect', async btn => {
    if (!btn.member?.permissions.has(PermissionFlagsBits.Administrator))
      return btn.reply({ content: '❌ Admins uniquement.', ephemeral: true });

    if (btn.customId === 'restore_no') {
      collector.stop();
      return btn.update({ embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('⏭️ Restauration ignorée.')], components: [] });
    }

    if (btn.customId === 'restore_yes') {
      collector.stop();
      await btn.update({ embeds: [new EmbedBuilder().setColor(0x6366f1).setDescription('🔄 Restauration en cours...')], components: [] });
      const nb = await restoreChannels(guild, backup);
      const glados = `Les salons ont été recréés. L'architecture est identique à la sauvegarde. Vos efforts de destruction étaient... médiocres. Cette fois.`;
      m.edit({ embeds: [new EmbedBuilder().setColor(0x22c55e)
        .setDescription(`✅ **${nb}** salons restaurés.\n\n*${glados}*`)], components: [] }).catch(() => {});
    }
  });
  collector.on('end', (_, r) => { if (r === 'time') m.edit({ components: [] }).catch(() => {}); });
}

// ════════════════════════════════════════════════════════════
//  Commandes
// ════════════════════════════════════════════════════════════
async function cmdBackup(msg) {
  if (!msg.member?.permissions.has(PermissionFlagsBits.Administrator)) return;
  try {
    const nb = saveBackup(msg.guild);
    msg.reply({ embeds: [new EmbedBuilder().setColor(0x22c55e)
      .setDescription(`✅ Sauvegarde effectuée — **${nb}** salons enregistrés.`)] });
  } catch (e) {
    msg.reply(`❌ Erreur : ${e.message}`);
  }
}

async function cmdRestore(msg) {
  if (!msg.member?.permissions.has(PermissionFlagsBits.Administrator)) return;
  const backup = loadBackup();
  if (!backup) return msg.reply('❌ Aucune sauvegarde trouvée. Fais `=backup` d\'abord.');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('restore_manual_yes').setLabel('✅ Confirmer la restauration').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('restore_manual_no').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary),
  );
  const m = await msg.reply({
    embeds: [new EmbedBuilder().setColor(0xf59e0b)
      .setDescription(`⚠️ Restaurer **${backup.channels.length}** salons depuis la sauvegarde du **${new Date(backup.savedAt).toLocaleDateString('fr-FR')}** ?`)],
    components: [row],
  });
  const collector = m.createMessageComponentCollector({ time: 30_000 });
  collector.on('collect', async btn => {
    if (btn.user.id !== msg.author.id) return btn.reply({ content: '❌', ephemeral: true });
    collector.stop();
    if (btn.customId === 'restore_manual_no') return btn.update({ content: '❌ Annulé.', embeds: [], components: [] });
    await btn.update({ embeds: [new EmbedBuilder().setColor(0x6366f1).setDescription('🔄 Restauration en cours...')], components: [] });
    const nb = await restoreChannels(msg.guild, backup);
    m.edit({ embeds: [new EmbedBuilder().setColor(0x22c55e).setDescription(`✅ **${nb}** salons restaurés.`)], components: [] }).catch(() => {});
  });
  collector.on('end', (_, r) => { if (r === 'time') m.edit({ components: [] }).catch(() => {}); });
}

// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = {
  _restore: restoreChannels,
  init(client) {
    // Détection suppression de salons
    client.on('channelDelete', ch => {
      if (!ch.guild) return;
      const now = Date.now();
      deleteLog.push(now);
      const window = deleteLog.filter(t => now - t <= DELETE_WINDOW);
      deleteLog.length = 0;
      deleteLog.push(...window);
      if (window.length >= DELETE_THRESH) sendEmergencyAlert(ch.guild, window.length);
    });

    // Backup auto au démarrage
    client.on('ready', () => {
      for (const guild of client.guilds.cache.values()) {
        try { saveBackup(guild); } catch {}
      }
      console.log('[Backup] ✅ Sauvegarde initiale effectuée.');

      // Backup auto toutes les 6h
      setInterval(() => {
        for (const guild of client.guilds.cache.values()) {
          try { saveBackup(guild); } catch {}
        }
      }, 6 * 3600 * 1000);
    });

    // Commandes
    client.on('messageCreate', async msg => {
      if (msg.author.bot || !msg.guild) return;
      if (msg.content === '=backup')  return cmdBackup(msg);
      if (msg.content === '=restore') return cmdRestore(msg);
    });

    console.log('[Backup] ✅ =backup =restore + alerte urgence + auto toutes les 6h');
  },
};
