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
const CHECK  = '<:592053verified:1510069208661098546>';
const PREFIX = '=';
const SANZOY_ID = '1323025414523977798';

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
  if (!input) return msg.reply(re(0xef4444, `${PERDU} Usage : \`=dep <montant|all>\``));
  const isAll  = input === 'all';
  if (isAll) {
    const { isCasinoBanned, fmtT } = require('../levels/buffs');
    if (isCasinoBanned(user)) return msg.reply(re(0xef4444, `🎰 Tu es banni(e) du casino pendant encore **${fmtT(user.buffs.casinoBan.exp)}** — \`=dep all\` bloqué !`));
  }
  const amount = isAll ? user.wallet : parseInt(input);
  if (!isAll && (isNaN(amount) || amount <= 0)) return msg.reply(re(0xef4444, `${PERDU} Montant invalide.`));
  if (user.wallet === 0 || amount === 0) return msg.reply(re(0xef4444, `${PERDU} Tu n'as rien sur toi.`));
  if (amount > user.wallet) return msg.reply(re(0xef4444, `${PERDU} Tu n'as que **${fmt(user.wallet)}** ${COIN} sur toi.`));
  user.wallet -= amount; user.bank += amount; saveUser(user);
  await updateQuestProgress(msg.guild, msg.author.id, 'bank', 1).catch(() => {});
  msg.reply(re(0x39ff14, `${CHECK} ${COIN} **${fmt(amount)}** déposé en banque !`));
}

// ── =with <montant|all> ──────────────────────────────────────
async function cmdWith(msg, args) {
  const user  = getUser(msg.author.id);
  const input = args[0]?.toLowerCase();
  if (!input) return msg.reply(re(0xef4444, `${PERDU} Usage : \`=with <montant|all>\``));
  const isAll  = input === 'all';
  if (isAll) {
    const { isCasinoBanned, fmtT } = require('../levels/buffs');
    if (isCasinoBanned(user)) return msg.reply(re(0xef4444, `🎰 Tu es banni(e) du casino pendant encore **${fmtT(user.buffs.casinoBan.exp)}** — \`=with all\` bloqué !`));
  }
  const amount = isAll ? user.bank : parseInt(input);
  if (!isAll && (isNaN(amount) || amount <= 0)) return msg.reply(re(0xef4444, `${PERDU} Montant invalide.`));
  if (user.bank === 0 || amount === 0) return msg.reply(re(0xef4444, `${PERDU} Tu n'as rien en banque.`));
  if (amount > user.bank) return msg.reply(re(0xef4444, `${PERDU} Tu n'as que **${fmt(user.bank)}** ${COIN} en banque.`));
  user.bank -= amount; user.wallet += amount; saveUser(user);
  msg.reply(re(0x39ff14, `${CHECK} ${COIN} **${fmt(amount)}** retiré de la banque !`));
}

// ── =bal [@mention] ──────────────────────────────────────────
async function cmdBal(msg) {
  const target = msg.mentions.users.first() ?? msg.author;
  const member = await msg.guild.members.fetch(target.id).catch(() => null);
  if (!member) return msg.reply(re(0xef4444, `${PERDU} Membre introuvable.`));
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
  if (!target)        return msg.reply(re(0xef4444, `${PERDU} Usage : \`=donner @membre <montant>\``));
  if (target.bot)     return msg.reply(re(0xef4444, `${PERDU} Tu ne peux pas donner des coins à un bot.`));
  if (target.id === msg.author.id) return msg.reply(re(0xef4444, `${PERDU} Tu ne peux pas te donner des coins.`));
  if (!montant || montant < 1) return msg.reply(re(0xef4444, `${PERDU} Montant invalide.`));
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
  if (!target) return msg.reply(re(0xef4444, `${PERDU} Usage : \`=rob @membre\``));
  if (target.id === msg.author.id) return msg.reply(re(0xef4444, `${PERDU} Tu ne peux pas te voler toi-même.`));
  if (PROTECTED_USERS.includes(target.id)) return msg.reply(re(0x5a5a7a, `🛡️ Cette personne est protégée.`));
  const robber = getUser(msg.author.id), victim = getUser(target.id);
  const now = Date.now();

  // KO check
  const { isKOd, isImmune, getShield, fmtT } = require('../levels/buffs');
  if (isKOd(robber)) return msg.reply(re(0xef4444, `${PERDU} Tu es KO pendant encore **${fmtT(robber.buffs.ko.exp)}** !`));

  const diff = now - (robber.rob?.lastUsed || 0);
  if (diff < ROB.COOLDOWN_MS) {
    const rem = Math.ceil((ROB.COOLDOWN_MS - diff) / 60_000);
    const h = Math.floor(rem / 60), m = rem % 60;
    return msg.reply(re(0xf59e0b, `⏳ Attends encore **${h > 0 ? `${h}h ${m}min` : `${m} min`}** avant de re-voler.`));
  }
  if (!robber.rob) robber.rob = {};
  robber.rob.lastUsed = now;

  // Immunité de la victime — l'Infini renvoie le coup : le voleur perd de l'argent au profit de la cible
  if (isImmune(victim)) {
    if (victim.buffs?.shield?.type === 'infini' && victim.buffs.shield.exp > now) {
      const penalty = Math.min(robber.wallet, Math.max(50, Math.floor(robber.wallet * 0.10)));
      robber.wallet -= penalty;
      victim.wallet += penalty;
      saveUser(robber); saveUser(victim);
      return msg.reply(re(0x5a5a7a, `♾️ **${target.username}** est protégé(e) par l'**Infini** — le contrecoup te fait perdre **${fmt(penalty)}** ${COIN}, transférés à lui/elle !`));
    }
    saveUser(robber);
    return msg.reply(re(0x5a5a7a, `♾️ **${target.username}** est immunisé(e) — rob impossible !`));
  }

  // Bouclier de la victime
  const shield = getShield(victim);
  if (shield) { saveUser(robber); return msg.reply(re(0x5a5a7a, `🛡️ **${target.username}** a un bouclier actif — rob bloqué !`)); }

  if (victim.wallet <= 0) { saveUser(robber); return msg.reply(re(0x5a5a7a, `💸 **${target.username}** n'a rien sur lui, tout est en banque !`)); }

  const percent = ROB.MIN_PERCENT + Math.random() * (ROB.MAX_PERCENT - ROB.MIN_PERCENT);
  let stolen = Math.max(1, Math.floor(victim.wallet * percent));

  // reduceLoss (haki)
  if (victim.buffs?.reduceLoss?.exp > now) stolen = Math.floor(stolen * (1 - victim.buffs.reduceLoss.v));

  // absorb / counterRob (gear4, pride, formation, etc.)
  if (victim.buffs?.absorb?.exp > now) {
    const back = Math.floor(stolen * victim.buffs.absorb.v);
    robber.wallet = Math.max(0, robber.wallet - back);
    victim.wallet += back;
  } else if (victim.buffs?.counterRob?.exp > now) {
    const back = Math.floor(stolen * victim.buffs.counterRob.v);
    robber.wallet = Math.max(0, robber.wallet - back);
    victim.wallet += back;
  }

  stolen = Math.min(stolen, victim.wallet);
  victim.wallet -= stolen; robber.wallet += stolen;
  saveUser(robber); saveUser(victim);
  msg.reply(re(0x22c55e, `${ROB.EMOJI_SUCCESS} Tu as volé ${ROB.EMOJI_COIN} **${fmt(stolen)}** à **${target.username}** !`));
  updateQuestProgress(msg.guild, msg.author.id, 'rob', 1).catch(() => {});
}

// ── =work ────────────────────────────────────────────────────
const JOBS = ['Tu as livré des colis','Tu as streamé et reçu des dons','Tu as vendu des NFT douteux','Tu as gardé le chien du voisin','Tu as livré des pizzas','Tu as réparé des PC','Tu as gagné un tournoi','Tu as travaillé comme caissier'];
async function cmdWork(msg) {
  const user = getUser(msg.author.id);
  const now = Date.now(), diff = now - (user.work?.lastUsed || 0);
  const CD = 4 * 3600 * 1000;
  if (diff < CD) {
    const rem = CD - diff;
    return msg.reply(re(0xf59e0b, `⏳ Prochaine prise de poste dans **${Math.floor(rem/3600000)}h ${Math.floor(rem%3600000/60000)}min**.`));
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
  if (!member) return msg.reply(re(0xef4444, `${PERDU} Membre introuvable.`));
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
    const level  = levelFromExp(u.exp || 0);
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
      if (btn.user.id !== msg.author.id) return btn.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`${PERDU} Utilise ta propre commande \`=top\`.`)], ephemeral: true });
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
    msg.reply(re(0xef4444, `${PERDU} Erreur lors de la génération du classement.`));
  }
}

// ── =quetes ──────────────────────────────────────────────────
const TYPE_CAT = { messages: 'MSG', vocal: 'VOC', coins: 'PRG', exp: 'PRG', commands: 'EVT', bank: 'PRG' };
async function cmdQuetes(msg) {
  try {
    const { generateDailyQuests } = require('../levels/quests');
    const { generateQuests }      = require('../levels/canvas');
    const member = await msg.guild.members.fetch(msg.author.id).catch(() => null);
    if (!member) return msg.reply(re(0xef4444, `${PERDU} Membre introuvable.`));
    const user = getUser(msg.author.id);
    generateDailyQuests(user);
    saveUser(user);
    const quests = (user.quests?.list || []).map(q => ({
      ...q,
      cat:  TYPE_CAT[q.type] || 'SPE',
      desc: `Progression : ${q.progress||0}/${q.target}`,
    }));
    if (!quests.length) return msg.reply(re(0x6366f1, `Aucune quête pour aujourd'hui.`));
    const buffer = await generateQuests(member, quests);
    msg.reply({ files: [new AttachmentBuilder(buffer, { name: 'quetes.png' })] });
  } catch(e) {
    console.error('[Prefix] quetes:', e.message);
    msg.reply(re(0xef4444, `${PERDU} Erreur lors de la génération des quêtes.`));
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
      { name: '⚔️ Personnages', value: '`=persos` — Liste des persos · `=attaques <nom>` — Techniques\n`=shop` — Boutique · `=acheter <nom>` — Acheter · `=equiper <nom>` — Équiper\n`=cd` — Cooldowns · `/boutique-persos` — Boutique slash (public)' },
      ...(isStaff ? [{ name: '🎫 Tickets (staff)', value: '`-delete` — Transcript + supprimer\n`vtxbot [action]` — IA modération' }] : []),
      ...(isStaff ? [{ name: '🎰 Modération Casino (staff)', value: '`=bancasino @membre <perm|durée> [raison]` — Bannir du casino (ex : `7j`, `12h`, `30min`)\n`=debancasino @membre` — Débannir du casino' }] : []),
      ...(isAdmin ? [{ name: '🛡️ Admin', value: '`/adminexpajouter` `/adminexpretirer` `/adminmoneyajouter` `/adminmoneyretirer`\n`/adminpersos add @m <perso>` — Donner un perso\n`/adminpersos remove @m <perso>` — Retirer un perso\n`/adminpersos list @m` — Lister les persos\n`/adminpersos resetcd @m [perso]` — Reset cooldowns\n`=admindonnerperso @m <perso>` · `=adminretirerperso @m <perso>` · `=adminlisterpersos @m`\n`=testsaison` — Aperçu de l\'annonce de fin de saison (sans reset)' }] : []),
    )
    .setFooter({ text: 'Boosts : /boutique · Inventaire : /inventaire · Quêtes : =quetes' });
  msg.reply({ embeds: [embed] });
}

// ════════════════════════════════════════════════════════════
//  =createroles — Création de rôles en masse (admin only)
// ════════════════════════════════════════════════════════════
const SYSTEM_ROLES = [
  'Satoru Gojo', 'Ryomen Sukuna', 'Son Goku', 'Vegeta',
  'Monkey D. Luffy', 'Roronoa Zoro', 'Naruto Uzumaki',
  'Saitama', 'Levi Ackerman', 'Light Yagami',
  'Receptacle', 'Heian Form', 'Éveillé',
];

async function cmdCreateRoles(msg, args) {
  if (!msg.member.permissions.has('Administrator'))
    return msg.reply(re(0xef4444, `${PERDU} Réservé aux administrateurs.`));

  // Avec args : =createroles Nom1, Nom2, Nom3
  const toCreate = args.length
    ? args.join(' ').split(',').map(r => r.trim()).filter(Boolean)
    : SYSTEM_ROLES;

  if (!toCreate.length) return msg.reply(re(0xef4444, `${PERDU} Aucun rôle à créer.`));

  const existing = msg.guild.roles.cache.map(r => r.name.toLowerCase());
  const pending  = toCreate.filter(r => !existing.includes(r.toLowerCase()));
  const skipped  = toCreate.filter(r =>  existing.includes(r.toLowerCase()));

  const status = await msg.reply(re(0x6366f1, `⏳ Création de **${pending.length}** rôle(s)...`));

  const created = [], failed = [];
  for (const name of pending) {
    try {
      await msg.guild.roles.create({ name, reason: `=createroles par ${msg.author.tag}` });
      created.push(name);
    } catch { failed.push(name); }
  }

  const lines = [];
  if (created.length) lines.push(`${CHECK} **Créés (${created.length}) :** ${created.map(r => `\`${r}\``).join(', ')}`);
  if (skipped.length) lines.push(`⏭️ **Déjà existants (${skipped.length}) :** ${skipped.map(r => `\`${r}\``).join(', ')}`);
  if (failed.length)  lines.push(`${PERDU} **Échec (${failed.length}) :** ${failed.map(r => `\`${r}\``).join(', ')}`);

  status.edit(re(failed.length ? 0xf59e0b : 0x22c55e, lines.join('\n')));
}

// ════════════════════════════════════════════════════════════
//  =bancasino / =debancasino — Modération casino (staff)
// ════════════════════════════════════════════════════════════
function isCasinoStaff(msg) {
  return !!(msg.member?.permissions.has('ModerateMembers') || msg.member?.permissions.has('BanMembers') || msg.member?.permissions.has('Administrator'));
}

// Parse "perm"/"permanent" → Infinity (ms), "7j"/"12h"/"30min" → ms, sinon null/undefined
function parseBanDuration(input) {
  if (!input) return undefined;
  const s = input.toLowerCase();
  if (s === 'perm' || s === 'permanent' || s === 'def' || s === 'definitif' || s === 'définitif') return Infinity;
  const m = s.match(/^(\d+)\s*(j|h|min|m)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n <= 0) return null;
  switch (m[2]) {
    case 'j':   return n * 24 * 3600 * 1000;
    case 'h':   return n * 3600 * 1000;
    default:    return n * 60 * 1000; // min | m
  }
}

// ── =bancasino @membre <perm|durée> [raison] ──────────────────
async function cmdBanCasino(msg, args) {
  if (!isCasinoStaff(msg)) return msg.reply(re(0xef4444, `${PERDU} Réservé au staff (modération).`));
  const target = msg.mentions.users.first();
  const usage  = `${PERDU} Usage : \`=bancasino @membre <perm|durée> [raison]\` (durée : ex \`7j\`, \`12h\`, \`30min\`)`;
  if (!target) return msg.reply(re(0xef4444, usage));
  if (target.bot) return msg.reply(re(0xef4444, `${PERDU} Impossible de bannir un bot.`));
  if (target.id === SANZOY_ID) return msg.reply(re(0xef4444, `${PERDU} Impossible.`));

  const durMs = parseBanDuration(args[1]);
  if (durMs === undefined) return msg.reply(re(0xef4444, usage));
  if (durMs === null) return msg.reply(re(0xef4444, `${PERDU} Durée invalide. Utilise \`perm\` ou un format comme \`7j\`, \`12h\`, \`30min\`.`));

  const reason = args.slice(2).join(' ') || 'Aucune raison fournie';
  const { setBuff, fmtT } = require('../levels/buffs');
  const exp = durMs === Infinity ? Infinity : Date.now() + durMs;
  const targetUser = getUser(target.id);
  setBuff(targetUser, 'casinoBan', { exp, from: msg.author.id, reason });
  saveUser(targetUser);

  const durText = exp === Infinity ? 'définitivement' : `pendant **${fmtT(exp)}**`;
  msg.reply(re(0xef4444, `🎰🚫 **${target.username}** a été banni(e) du casino ${durText}.\n📝 Raison : ${reason}`));
}

// ── =debancasino @membre ───────────────────────────────────────
async function cmdDebanCasino(msg, args) {
  if (!isCasinoStaff(msg)) return msg.reply(re(0xef4444, `${PERDU} Réservé au staff (modération).`));
  const target = msg.mentions.users.first();
  if (!target) return msg.reply(re(0xef4444, `${PERDU} Usage : \`=debancasino @membre\``));

  const { isCasinoBanned, clearBuff } = require('../levels/buffs');
  const targetUser = getUser(target.id);
  if (!isCasinoBanned(targetUser)) return msg.reply(re(0xf59e0b, `${PERDU} **${target.username}** n'est pas banni(e) du casino.`));

  clearBuff(targetUser, 'casinoBan');
  saveUser(targetUser);
  msg.reply(re(0x22c55e, `${CHECK} **${target.username}** a été débanni(e) du casino.`));
}

// ── =testsaison ──────────────────────────────────────────────
// Aperçu de l'annonce de fin de saison dans le salon courant, SANS aucun reset.
async function cmdTestSaison(msg) {
  if (!msg.member.permissions.has('Administrator')) return msg.reply(re(0xef4444, `${PERDU} Réservé aux administrateurs.`));
  const { previewSeasonEnd } = require('../levels/seasons');
  await previewSeasonEnd(msg.client, msg.channel.id);
  msg.reply(re(0x22c55e, `${CHECK} Aperçu de fin de saison posté ici (aucune donnée réinitialisée).`));
}

// ════════════════════════════════════════════════════════════
//  ROUTING
// ════════════════════════════════════════════════════════════
const CMDS = {
  dep: cmdDep, with: cmdWith, bal: cmdBal, donner: cmdDonner,
  rob: cmdRob, work: cmdWork, profil: cmdProfil, top: cmdTop,
  quetes: cmdQuetes, aide: cmdAide, createroles: cmdCreateRoles,
  bancasino: cmdBanCasino, debancasino: cmdDebanCasino,
  testsaison: cmdTestSaison,
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
        return msg.reply(re(0xef4444, `${PERDU} La commande \`=${name}\` est désactivée.`));
      try { await handler(msg, args); } catch(e) { console.error('[Prefix]', e.message); }
    });
    console.log('[Prefix] ✅ =dep =with =bal =donner =rob =work =profil =top =quetes =aide =bancasino =debancasino =testsaison');
  },
};
