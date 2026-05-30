'use strict';

// ════════════════════════════════════════════════════════════
//  prefix.js — Commandes économie & utilitaires en =cmd
// ════════════════════════════════════════════════════════════

const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, saveUser }                = require('../levels/db');
const { fmt }                              = require('../levels/levels');
const { updateQuestProgress }              = require('../levels/quests');
const { PROTECTED_USERS, ROB }             = require('../levels/config');
const { getConfig }                        = require('../config');

const COIN   = '<:49c1a23b876841ce87e5aa7dbeacada9:1510067105767227423>';
const PERDU  = '<:26643crossmark:1510067005066055690>';
const PREFIX = '=';

function re(color, desc) {
  return { embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] };
}
function noFunds(user, cost) {
  const needed = cost - user.wallet;
  if (user.bank >= needed)
    return re(0xef4444, `${PERDU} Pas assez sur toi ! Fais \`=with ${needed}\` pour retirer de la banque ${COIN}`);
  return re(0xef4444, `${PERDU} Pas assez de coins ! (${fmt(user.wallet)} sur toi · ${fmt(user.bank)} en banque) ${COIN}`);
}

// ── =dep <montant|all> ───────────────────────────────────────
async function cmdDep(msg, args) {
  const user  = getUser(msg.author.id);
  const input = args[0]?.toLowerCase();
  if (!input) return msg.reply('❌ Usage : `=dep <montant|all>`');
  const amount = input === 'all' ? user.wallet : parseInt(input);
  if (isNaN(amount) || amount <= 0) return msg.reply('❌ Montant invalide.');
  if (amount === 0 || user.wallet === 0) return msg.reply('❌ Tu n\'as rien sur toi.');
  if (amount > user.wallet) return msg.reply(`❌ Tu n'as que **${fmt(user.wallet)}** ${COIN} sur toi.`);
  user.wallet -= amount; user.bank += amount; saveUser(user);
  await updateQuestProgress(msg.guild, msg.author.id, 'bank', 1).catch(() => {});
  msg.reply(re(0x6366f1, `🏦 +**${fmt(amount)}** en banque ${COIN} · Portefeuille : **${fmt(user.wallet)}** · Banque : **${fmt(user.bank)}**`));
}

// ── =with <montant|all> ──────────────────────────────────────
async function cmdWith(msg, args) {
  const user  = getUser(msg.author.id);
  const input = args[0]?.toLowerCase();
  if (!input) return msg.reply('❌ Usage : `=with <montant|all>`');
  const amount = input === 'all' ? user.bank : parseInt(input);
  if (isNaN(amount) || amount <= 0) return msg.reply('❌ Montant invalide.');
  if (amount === 0 || user.bank === 0) return msg.reply('❌ Tu n\'as rien en banque.');
  if (amount > user.bank) return msg.reply(`❌ Tu n'as que **${fmt(user.bank)}** ${COIN} en banque.`);
  user.bank -= amount; user.wallet += amount; saveUser(user);
  msg.reply(re(0x6366f1, `💸 +**${fmt(amount)}** sur toi ${COIN} · Portefeuille : **${fmt(user.wallet)}** · Banque : **${fmt(user.bank)}**`));
}

// ── =bal [@mention] ──────────────────────────────────────────
async function cmdBal(msg) {
  const target = msg.mentions.users.first() ?? msg.author;
  const member = await msg.guild.members.fetch(target.id).catch(() => null);
  if (!member) return msg.reply('❌ Membre introuvable.');
  try {
    const { generateBal } = require('../levels/canvas');
    const userData = getUser(target.id);
    const buffer   = await generateBal(member, userData);
    msg.reply({ files: [new AttachmentBuilder(buffer, { name: 'bal.png' })] });
  } catch {
    const u = getUser(target.id);
    msg.reply(re(0x6366f1, `💰 **${target.username}** · Portefeuille : **${fmt(u.wallet)}** ${COIN} · Banque : **${fmt(u.bank)}** ${COIN}`));
  }
}

// ── =donner @mention <montant> ───────────────────────────────
async function cmdDonner(msg, args) {
  const target  = msg.mentions.users.first();
  const montant = parseInt(args.find(a => !isNaN(parseInt(a))));
  if (!target)        return msg.reply('❌ Usage : `=donner @membre <montant>`');
  if (target.bot)     return msg.reply('❌ Tu ne peux pas donner des coins à un bot.');
  if (target.id === msg.author.id) return msg.reply('❌ Tu ne peux pas te donner des coins.');
  if (!montant || montant < 1) return msg.reply('❌ Montant invalide.');
  const donneur  = getUser(msg.author.id);
  const receveur = getUser(target.id);
  if (donneur.wallet < montant) return msg.reply(noFunds(donneur, montant));
  donneur.wallet  -= montant;
  receveur.wallet += montant;
  saveUser(donneur); saveUser(receveur);
  msg.reply(re(0x22c55e, `💸 <@${msg.author.id}> → <@${target.id}> **${fmt(montant)}** ${COIN} · Ton solde : **${fmt(donneur.wallet)}**`));
}

// ── =rob @mention ────────────────────────────────────────────
async function cmdRob(msg) {
  const target = msg.mentions.users.first();
  if (!target) return msg.reply('❌ Usage : `=rob @membre`');
  if (target.id === msg.author.id) return msg.reply('❌ Tu ne peux pas te voler toi-même.');
  if (PROTECTED_USERS.includes(target.id)) return msg.reply('🛡️ Cette personne est protégée.');
  const robber = getUser(msg.author.id), victim = getUser(target.id);
  const now = Date.now(), diff = now - (robber.rob?.lastUsed || 0);
  if (diff < ROB.COOLDOWN_MS) {
    const rem = Math.ceil((ROB.COOLDOWN_MS - diff) / 60_000);
    const h = Math.floor(rem / 60), m = rem % 60;
    return msg.reply(`⏳ Attends encore **${h > 0 ? `${h}h ${m}min` : `${m} min`}** avant de re-voler.`);
  }
  if (!robber.rob) robber.rob = {};
  robber.rob.lastUsed = now;
  if (victim.wallet <= 0) { saveUser(robber); return msg.reply(re(0x5a5a7a, `💸 **${target.username}** n'a rien sur lui, tout est en banque !`)); }
  const percent = ROB.MIN_PERCENT + Math.random() * (ROB.MAX_PERCENT - ROB.MIN_PERCENT);
  const stolen  = Math.max(1, Math.floor(victim.wallet * percent));
  victim.wallet -= stolen; robber.wallet += stolen;
  saveUser(robber); saveUser(victim);
  msg.reply(re(0x22c55e, `${ROB.EMOJI_SUCCESS} Tu as volé ${ROB.EMOJI_COIN} **${fmt(stolen)}** à **${target.username}** !`));
}

// ── =work ────────────────────────────────────────────────────
const JOBS = ['Tu as livré des colis','Tu as streamé et reçu des dons','Tu as vendu des NFT douteux','Tu as gardé le chien du voisin','Tu as livré des pizzas','Tu as réparé des PC','Tu as gagné un tournoi','Tu as travaillé comme caissier'];
async function cmdWork(msg) {
  const user = getUser(msg.author.id);
  const now = Date.now(), diff = now - (user.work?.lastUsed || 0);
  const CD = 4 * 3600 * 1000;
  if (diff < CD) {
    const rem = CD - diff;
    return msg.reply(`⏳ Prochaine prise de poste dans **${Math.floor(rem/3600000)}h ${Math.floor(rem%3600000/60000)}min**.`);
  }
  const earned = Math.floor(Math.random() * 1001) + 500;
  if (!user.work) user.work = {};
  user.work.lastUsed = now; user.wallet += earned; saveUser(user);
  msg.reply(re(0x6366f1, `💼 ${JOBS[Math.floor(Math.random()*JOBS.length)]} — +**${fmt(earned)}** ${COIN} · Solde : **${fmt(user.wallet)}** ${COIN}`));
}

// ── =profil [@mention] ───────────────────────────────────────
async function cmdProfil(msg) {
  const target = msg.mentions.users.first() ?? msg.author;
  const member = await msg.guild.members.fetch(target.id).catch(() => null);
  if (!member) return msg.reply('❌ Membre introuvable.');
  try {
    const { generateProfile } = require('../levels/canvas');
    const userData = getUser(target.id);
    const buffer   = await generateProfile(member, userData);
    msg.reply({ files: [new AttachmentBuilder(buffer, { name: 'profil.png' })] });
  } catch(e) {
    console.error('[Prefix] profil canvas:', e.message);
    const u = getUser(target.id);
    msg.reply(re(0x6366f1, `👤 **${target.username}** · XP : **${fmt(u.exp)}** · Level : **${u.level}** · Wallet : **${fmt(u.wallet)}** ${COIN}`));
  }
}

// ── =top [exp|coins] ─────────────────────────────────────────
async function buildTopEntries(guild, mode) {
  const { getAllUsers } = require('../levels/db');
  const { getRankForLevel, levelFromExp } = require('../levels/levels');
  const db   = getAllUsers();
  const list = Object.values(db)
    .sort((a, b) => mode === 'coins'
      ? ((b.wallet||0)+(b.bank||0)) - ((a.wallet||0)+(a.bank||0))
      : (b.exp||0) - (a.exp||0))
    .slice(0, 10);
  return Promise.all(list.map(async u => {
    const member = await guild.members.fetch(u.userId).catch(() => null);
    const level  = u.level ?? levelFromExp(u.exp||0) ?? 0;
    const rank   = getRankForLevel(level);
    const def    = `https://cdn.discordapp.com/embed/avatars/${(Number(BigInt(u.userId) >> 22n) % 6)}.png`;
    return {
      avatarURL: member?.user.displayAvatarURL({ extension: 'png', size: 64, forceStatic: true }) || def,
      username:  member?.user.username || `Joueur ${u.userId.slice(-4)}`,
      rank:      rank?.name || '—',
      level,
      exp:   u.exp   || 0,
      coins: (u.wallet||0) + (u.bank||0),
    };
  }));
}

function topRow(mode) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('top_exp')
      .setLabel('⭐ Top EXP').setStyle(mode === 'exp' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('top_coins')
      .setLabel('💰 Top Coins').setStyle(mode === 'coins' ? ButtonStyle.Primary : ButtonStyle.Secondary),
  );
}

async function cmdTop(msg, args) {
  try {
    const { generateLeaderboard } = require('../levels/canvas');
    let mode = args[0]?.toLowerCase() === 'coins' ? 'coins' : 'exp';

    const entries = await buildTopEntries(msg.guild, mode);
    const buffer  = await generateLeaderboard(entries, mode);
    const reply   = await msg.reply({ files: [new AttachmentBuilder(buffer, { name: 'top.png' })], components: [topRow(mode)] });

    const collector = reply.createMessageComponentCollector({ time: 120_000 });
    collector.on('collect', async btn => {
      if (btn.user.id !== msg.author.id) return btn.reply({ content: '❌ Utilise ta propre commande `=top`.', ephemeral: true });
      mode = btn.customId === 'top_coins' ? 'coins' : 'exp';
      await btn.deferUpdate();
      try {
        const newEntries = await buildTopEntries(msg.guild, mode);
        const newBuffer  = await generateLeaderboard(newEntries, mode);
        await reply.edit({ files: [new AttachmentBuilder(newBuffer, { name: 'top.png' })], components: [topRow(mode)] });
      } catch(e) { console.error('[Top] bouton:', e.message); }
    });
    collector.on('end', () => reply.edit({ components: [] }).catch(() => {}));
  } catch(e) {
    console.error('[Prefix] top:', e.message);
    msg.reply('❌ Erreur lors de la génération du classement.');
  }
}

// ── =quetes ──────────────────────────────────────────────────
const TYPE_CAT = { messages: 'MSG', vocal: 'VOC', coins: 'PRG', exp: 'PRG', streak: 'SPE', commands: 'EVT', bank: 'PRG' };
async function cmdQuetes(msg) {
  try {
    const { generateDailyQuests } = require('../levels/quests');
    const { generateQuests }      = require('../levels/canvas');
    const member = await msg.guild.members.fetch(msg.author.id).catch(() => null);
    if (!member) return msg.reply('❌ Membre introuvable.');
    const user = getUser(msg.author.id);
    generateDailyQuests(user);
    saveUser(user);
    const quests = (user.quests?.list || []).map(q => ({
      ...q,
      cat:  TYPE_CAT[q.type] || 'SPE',
      desc: `Progression : ${q.progress||0}/${q.target}`,
    }));
    if (!quests.length) return msg.reply('Aucune quête pour aujourd\'hui.');
    const buffer = await generateQuests(member, quests);
    msg.reply({ files: [new AttachmentBuilder(buffer, { name: 'quetes.png' })] });
  } catch(e) {
    console.error('[Prefix] quetes:', e.message);
    msg.reply('❌ Erreur lors de la génération des quêtes.');
  }
}

// ── =aide ────────────────────────────────────────────────────
async function cmdAide(msg) {
  const isStaff = msg.member?.permissions.has('ModerateMembers') || msg.member?.permissions.has('BanMembers') || msg.member?.permissions.has('Administrator');
  const isAdmin = msg.member?.permissions.has('Administrator');
  const embed = new EmbedBuilder().setColor(0x7c5cfc)
    .setTitle('📖 Aide — Commandes disponibles')
    .setThumbnail(msg.client.user.displayAvatarURL())
    .addFields(
      { name: '👤 Profil & Niveaux', value: '`=profil [@membre]` — Profil\n`=top [exp|coins]` — Classement' },
      { name: '🎯 Quêtes', value: '`=quetes` — Quêtes journalières' },
      { name: '💰 Économie', value: '`=bal [@membre]` — Solde\n`=dep <montant|all>` — Déposer\n`=with <montant|all>` — Retirer\n`=donner @membre <montant>` — Donner\n`=rob @membre` — Voler\n`=work` — Travailler (4h)' },
      { name: '🎰 Casino', value: '`=bj <mise>` — Blackjack\n`=spin` — Machine à sous\n`=slots` — Slots\n`=pf <mise> <pile|face>` — Pile ou face\n`=dice <mise> [1-6]` — Dé\n`=roulette <mise> <rouge|noir|vert>` — Roulette\n`=cup <mise> <1|2|3>` — Gobelets\n`=pfc <mise> <pierre|feuille|ciseaux>` — PFC\n`=rr <mise>` — Roulette russe' },
      ...(isStaff ? [{ name: '🎫 Tickets (staff)', value: '`-delete` — Transcript + supprimer\n`vtxbot [action]` — IA modération' }] : []),
      ...(isAdmin ? [{ name: '🛡️ Admin', value: '/adminexpajouter /adminexpretirer\n/adminmoneyajouter /adminmoneyretirer' }] : []),
    )
    .setFooter({ text: 'Boosts : /boutique · Inventaire : /inventaire · Quêtes : =quetes' });
  msg.reply({ embeds: [embed] });
}

// ════════════════════════════════════════════════════════════
//  ROUTING
// ════════════════════════════════════════════════════════════
const CMDS = {
  dep: cmdDep, with: cmdWith, bal: cmdBal, donner: cmdDonner,
  rob: cmdRob, work: cmdWork, profil: cmdProfil, top: cmdTop,
  quetes: cmdQuetes, aide: cmdAide,
};

module.exports = {
  init(client) {
    client.on('messageCreate', async msg => {
      if (msg.author.bot || !msg.guild) return;
      const content = msg.content.trim();
      if (!content.startsWith(PREFIX)) return;
      const [cmd, ...args] = content.slice(1).trim().split(/\s+/);
      const name = cmd.toLowerCase();
      const handler = CMDS[name];
      if (!handler) return;
      const cfg = await getConfig();
      if ((cfg.disabled_commands || []).includes(name))
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`❌ La commande \`=${name}\` est désactivée.`)] });
      try { await handler(msg, args); } catch(e) { console.error('[Prefix]', e.message); }
    });
    console.log('[Prefix] ✅ =dep =with =bal =donner =rob =work =profil =top =quetes =aide');
  },
};
