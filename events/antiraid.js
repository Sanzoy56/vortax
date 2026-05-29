'use strict';

// ════════════════════════════════════════════════════════════
//  antiraid.js — Détection raid + auto-ban + commandes test
// ════════════════════════════════════════════════════════════

const { EmbedBuilder, PermissionFlagsBits, GuildVerificationLevel, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ── Config (ajustable) ───────────────────────────────────────
const CFG = {
  JOIN_WINDOW_MS:   10_000,  // fenêtre de détection (10s)
  JOIN_THRESHOLD:   5,       // joins pour déclencher le raid
  NEW_ACCOUNT_DAYS: 7,       // compte < 7j = suspect
  LOCKDOWN_MINUTES: 10,      // durée du lockdown
  BAN_REASON:       '[Anti-Raid] Détection automatique de raid',
};

// ── State ────────────────────────────────────────────────────
const joinLog     = [];         // { id, timestamp }
const msgLog      = new Map();  // userId → [timestamps]
let   raidMode    = false;
let   lockdownEnd = 0;

// Config spam messages
const SPAM_CFG = {
  MSG_WINDOW_MS:  3_000,  // fenêtre 3s
  MSG_THRESHOLD:  20,     // 20 messages en 3s = spam
};

function logChannel(guild) {
  // Cherche un salon #logs ou #anti-raid dans le cache
  return guild.channels.cache.find(c =>
    c.isTextBased() && /log|raid|mod|alert/i.test(c.name)
  ) || null;
}

function isNewAccount(member) {
  const ageMs  = Date.now() - member.user.createdTimestamp;
  const ageDays = ageMs / 86_400_000;
  return ageDays < CFG.NEW_ACCOUNT_DAYS;
}

async function sendAlert(guild, embed) {
  const ch = logChannel(guild);
  if (ch) ch.send({ embeds: [embed] }).catch(() => {});
}

async function banMember(member, reason) {
  if (!member.bannable) { console.log(`[AntiRaid] ⚠️ Impossible de ban ${member.user.tag} (pas bannable)`); return false; }
  try {
    await member.ban({ reason, deleteMessageSeconds: 86400 });
    console.log(`[AntiRaid] 🔨 Banni : ${member.user.tag} — ${reason}`);
    return true;
  } catch(e) {
    console.error(`[AntiRaid] ❌ Échec ban ${member.user.tag} : ${e.message}`);
    return false;
  }
}

// ════════════════════════════════════════════════════════════
//  guildMemberAdd — détection raid + nouveaux comptes
// ════════════════════════════════════════════════════════════
async function onMemberAdd(member) {
  const guild = member.guild;
  const now   = Date.now();

  // ── Nouveaux comptes suspects (même hors raid) ──
  if (isNewAccount(member)) {
    if (raidMode) {
      // En mode raid : auto-ban direct
      await banMember(member, CFG.BAN_REASON + ' (nouveau compte)');
      await sendAlert(guild, new EmbedBuilder()
        .setColor(0xef4444)
        .setDescription(`🔨 **${member.user.tag}** auto-ban — compte créé il y a moins de **${CFG.NEW_ACCOUNT_DAYS}j** (mode raid actif)`));
      return;
    }
  }

  // ── Détection flood de joins ──
  joinLog.push({ id: member.id, ts: now });

  // Nettoie les entrées hors fenêtre
  const window = joinLog.filter(e => now - e.ts <= CFG.JOIN_WINDOW_MS);
  joinLog.length = 0;
  joinLog.push(...window);

  if (window.length >= CFG.JOIN_THRESHOLD && !raidMode) {
    console.log(`[AntiRaid] 🚨 RAID DÉTECTÉ — ${window.length} joins en ${CFG.JOIN_WINDOW_MS/1000}s`);
    raidMode    = true;
    lockdownEnd = now + CFG.LOCKDOWN_MINUTES * 60_000;

    // Lockdown : niveau de vérification maximum
    try {
      await guild.setVerificationLevel(GuildVerificationLevel.VeryHigh);
    } catch {}

    await sendAlert(guild, new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🚨 RAID DÉTECTÉ — MODE LOCKDOWN ACTIVÉ')
      .setDescription([
        `**${window.length}** joins en moins de **${CFG.JOIN_WINDOW_MS/1000}s**`,
        `Lockdown pour **${CFG.LOCKDOWN_MINUTES} minutes**`,
        `Nouveaux comptes (<${CFG.NEW_ACCOUNT_DAYS}j) seront auto-ban`,
      ].join('\n'))
      .setTimestamp());

    // Ban tous les membres du flood
    for (const entry of window) {
      const m = guild.members.cache.get(entry.id);
      if (m) await banMember(m, CFG.BAN_REASON);
    }

    // Fin du lockdown automatique
    setTimeout(async () => {
      raidMode = false;
      try { await guild.setVerificationLevel(GuildVerificationLevel.Low); } catch {}
      await sendAlert(guild, new EmbedBuilder()
        .setColor(0x22c55e)
        .setDescription(`✅ Mode raid désactivé — vérification revenue à la normale.`));
    }, CFG.LOCKDOWN_MINUTES * 60_000);
  }
}

// ════════════════════════════════════════════════════════════
//  Audit log — détecte qui supprime/renomme et le ban
// ════════════════════════════════════════════════════════════
async function checkAuditAndBan(guild, auditAction) {
  try {
    await new Promise(r => setTimeout(r, 1500)); // attend que l'audit log se mette à jour
    const logs = await guild.fetchAuditLogs({ limit: 1, type: auditAction });
    const entry = logs.entries.first();
    if (!entry) return;

    const executor = entry.executor;
    if (!executor || executor.id === guild.client.user.id) return;

    // Ignore si c'est un admin protégé
    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;
    if (member.permissions.has(PermissionFlagsBits.Administrator) && !member.user.bot) {
      console.log(`[AntiRaid] ℹ️ Action de l'admin ${executor.tag} — ignoré`);
      return;
    }

    console.log(`[AntiRaid] 🔎 Action destructive par : ${executor.tag} (bot: ${executor.bot})`);
    const banned = await banMember(member, `[Anti-Raid] Action destructive détectée (audit log)`);
    if (banned) {
      await sendAlert(guild, new EmbedBuilder()
        .setColor(0xef4444)
        .setDescription(`🔨 **${executor.tag}** banni — action destructive détectée via audit log${executor.bot ? ' *(bot/app)*' : ''}`));
    }
  } catch(e) {
    console.error('[AntiRaid] Erreur audit log :', e.message);
  }
}

// ════════════════════════════════════════════════════════════
//  messageCreate — détection spam (bots ou humains)
// ════════════════════════════════════════════════════════════
async function onMessageSpam(message) {
  if (!message.guild) return;
  // Ignore les messages normaux (seulement si déjà en raid ou si c'est un bot suspect)
  const isBot    = message.author.bot;
  const authorId = message.author.id;

  const now  = Date.now();
  const times = (msgLog.get(authorId) || []).filter(t => now - t < SPAM_CFG.MSG_WINDOW_MS);
  times.push(now);
  msgLog.set(authorId, times);

  if (times.length >= SPAM_CFG.MSG_THRESHOLD) {
    msgLog.delete(authorId);
    const member = message.guild.members.cache.get(authorId);
    if (!member) return;

    // Ban le spammer
    const banned = await banMember(member, '[Anti-Raid] Spam détecté');
    if (banned) {
      await sendAlert(message.guild, new EmbedBuilder()
        .setColor(0xef4444)
        .setDescription(`🔨 **${message.author.tag}** banni — **${times.length} messages en ${SPAM_CFG.MSG_WINDOW_MS/1000}s**${isBot ? ' *(bot)*' : ''}`));
    }
  }
}

// ════════════════════════════════════════════════════════════
//  Commandes test (admin uniquement)
// ════════════════════════════════════════════════════════════

const ALLOWED    = new Set(['1072956185667444737', '1323025414523977798', '1405637417272086588']);
const TEST_SERVER = '1495863681420886057';

function isAdmin(member) {
  return ALLOWED.has(member?.id) || member?.permissions.has(PermissionFlagsBits.Administrator);
}
function isTestServer(msg) {
  return msg.guild?.id === TEST_SERVER;
}

// =raid status
async function cmdRaidStatus(msg) {
  msg.reply({ embeds: [new EmbedBuilder()
    .setColor(raidMode ? 0xef4444 : 0x22c55e)
    .setDescription(raidMode
      ? `🚨 **Mode raid ACTIF** — se termine <t:${Math.floor(lockdownEnd/1000)}:R>`
      : `✅ **Mode raid inactif** — seuil : ${CFG.JOIN_THRESHOLD} joins / ${CFG.JOIN_WINDOW_MS/1000}s`)] });
}

// =raid off — désactive manuellement le mode raid
async function cmdRaidOff(msg) {
  raidMode = false;
  try { await msg.guild.setVerificationLevel(GuildVerificationLevel.Low); } catch {}
  msg.reply({ embeds: [new EmbedBuilder().setColor(0x22c55e).setDescription('✅ Mode raid désactivé manuellement.')] });
}

// =nuke — spam "bonjour" dans tous les salons (TEST anti-raid uniquement)
async function cmdNuke(msg) {

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nuke_confirm').setLabel('✅ Confirmer').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('nuke_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary),
  );

  const m = await msg.reply({ content: '⚠️ **NUKE TEST** — Spam "bonjour" dans tous les salons pour tester l\'anti-raid.', components: [row] });

  const collector = m.createMessageComponentCollector({ time: 15_000 });
  collector.on('collect', async btn => {
    if (btn.user.id !== msg.author.id) return btn.reply({ content: '❌ Pas ton commande.', ephemeral: true });

    if (btn.customId === 'nuke_cancel') {
      collector.stop();
      return btn.update({ content: '❌ Annulé.', components: [] });
    }

    if (btn.customId === 'nuke_confirm') {
      collector.stop();
      const channels = msg.guild.channels.cache.filter(c =>
        c.isTextBased() && c.permissionsFor(msg.guild.members.me)?.has('SendMessages')
      );
      await btn.update({ content: `🚀 Spam lancé dans **${channels.size}** salons...`, components: [] });

      for (const ch of channels.values()) {
        for (let i = 0; i < 10; i++) {
          await ch.send('bonjour').catch(() => {});
        }
      }
      m.edit({ content: '✅ Nuke test terminé — vérifie si l\'anti-raid a réagi.' }).catch(() => {});
    }
  });
  collector.on('end', (_, reason) => {
    if (reason === 'time') m.edit({ content: '❌ Temps écoulé — annulé.', components: [] }).catch(() => {});
  });
}

// =testban — se ban soi-même puis se déban (test du mécanisme de ban)
async function cmdTestban(msg) {
  if (!isTestServer(msg)) return msg.reply('❌ Serveur test uniquement.');

  const userId = msg.author.id;
  await msg.reply('🧪 Test ban en cours...');

  try {
    await msg.guild.members.ban(userId, { reason: '[TEST] Anti-raid ban test', deleteMessageSeconds: 0 });
    await new Promise(r => setTimeout(r, 2000));
    await msg.guild.bans.remove(userId, '[TEST] Auto-déban après test');
    msg.channel.send(`✅ Ban test réussi — <@${userId}> a bien été banni puis débanni.`).catch(() => {});
  } catch (e) {
    msg.channel.send(`❌ Échec du ban : ${e.message}`).catch(() => {});
  }
}

// =simulate-raid — injecte de faux joins pour déclencher la détection
async function cmdSimulateRaid(msg) {
  if (!isTestServer(msg)) return msg.reply('❌ Serveur test uniquement.');

  await msg.reply(`🧪 Simulation de raid en cours — injection de **${CFG.JOIN_THRESHOLD + 2}** joins...`);

  // Injecte de faux timestamps dans le joinLog pour dépasser le seuil
  const now = Date.now();
  for (let i = 0; i < CFG.JOIN_THRESHOLD + 2; i++) {
    joinLog.push({ id: `fake_${i}`, ts: now - i * 100 });
  }

  // Déclenche manuellement la détection avec le member réel pour tester
  await onMemberAdd(msg.member);
}

// =massban <nombre> — ban les X derniers membres (test)
async function cmdMassban(msg, args) {
  const nb = Math.min(parseInt(args[0]) || 5, 20);
  const members = [...msg.guild.members.cache.values()]
    .filter(m => !m.user.bot && m.id !== msg.author.id)
    .sort((a, b) => b.joinedTimestamp - a.joinedTimestamp)
    .slice(0, nb);
  let banned = 0;
  for (const m of members) { if (await banMember(m, '[TEST] Massban')) banned++; }
  msg.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`🔨 **${banned}** membres bannis (test).`)] });
}

// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = {
  init(client) {
    client.on('guildMemberAdd', onMemberAdd);
    client.on('messageCreate',  onMessageSpam);

    // Détection actions destructives via audit log
    const { AuditLogEvent } = require('discord.js');

    client.on('channelDelete',  ch  => { console.log(`[AntiRaid] 🗑️ Salon supprimé : #${ch.name}`); checkAuditAndBan(ch.guild, AuditLogEvent.ChannelDelete); });
    client.on('roleDelete',     r   => { console.log(`[AntiRaid] 🗑️ Rôle supprimé : @${r.name}`);  checkAuditAndBan(r.guild,  AuditLogEvent.RoleDelete); });
    client.on('guildUpdate',    (o,n) => {
      if (o.name !== n.name) console.log(`[AntiRaid] ✏️ Serveur renommé : "${o.name}" → "${n.name}"`);
      checkAuditAndBan(n, AuditLogEvent.GuildUpdate);
    });

    client.on('messageCreate', async msg => {
      if (msg.author.bot || !msg.guild) return;
      const [cmd, ...args] = msg.content.trim().split(/\s+/);
      if (cmd === '=raid')    { if (args[0] === 'status') return cmdRaidStatus(msg); if (args[0] === 'off') return cmdRaidOff(msg); }
      if (cmd === '=nuke')            { if (!isTestServer(msg)) return msg.reply('❌ Serveur test uniquement.'); return cmdNuke(msg); }
      if (cmd === '=massban')         { if (!isTestServer(msg)) return msg.reply('❌ Serveur test uniquement.'); return cmdMassban(msg, args); }
      if (cmd === '=simulate-raid')   return cmdSimulateRaid(msg);
      if (cmd === '=testban')         return cmdTestban(msg);
    });

    console.log('[AntiRaid] ✅ Détection raid + =raid status/off + =nuke + =massban');
  },

  // Expose pour forcer le mode raid via d'autres modules si besoin
  get raidMode() { return raidMode; },
};
