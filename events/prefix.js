'use strict';

// ════════════════════════════════════════════════════════════
//  prefix.js — Commandes économie & utilitaires en =cmd
// ════════════════════════════════════════════════════════════

const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
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
    const { generateBal } = require('../levels/tasks/cardsGen');
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

// ── Arbre de compétences (données) ──────────────────────────
// 3 branches seulement : QUÊTE, BOUTIQUE, RANKED (guilde et événement retirées)
const PROFIL_TREE_BRANCHES = [
  { key: 'quete',    label: 'QUÊTE',    color: '#6fae7f', icon: 'sword' },
  { key: 'boutique', label: 'BOUTIQUE', color: '#c9a24a', icon: 'diamond' },
  { key: 'ranked',   label: 'RANKED',   color: '#6f9bd6', icon: 'star' },
];

// Coût pour débloquer chaque palier (1 → 5) : de 200k à 8M vtxcoins
const PROFIL_TIER_COSTS = [200_000, 1_000_000, 2_500_000, 5_000_000, 8_000_000];
function profilCostForTier(tierNumber) {
  return PROFIL_TIER_COSTS[tierNumber - 1] ?? PROFIL_TIER_COSTS[PROFIL_TIER_COSTS.length - 1];
}

// Tente de débloquer le prochain palier disponible d'une branche.
// Monnaie utilisée : user.wallet (les vtxcoins "sur soi", comme =donner/=rob/=work).
// Renvoie { ok:true, cost, branch, tierNumber } ou { ok:false, reason }
function profilUnlockNextTier(user, branchKey) {
  const branchDef = PROFIL_TREE_BRANCHES.find(b => b.key === branchKey);
  if (!branchDef) return { ok: false, reason: 'branch_not_found' };

  const tree = profilEnsureSkillTree(user);
  const tiers = tree.branches[branchKey];
  const nextIndex = tiers.findIndex(t => !t.done);
  if (nextIndex === -1) return { ok: false, reason: 'maxed', branch: branchDef };
  if (tiers[nextIndex].locked) return { ok: false, reason: 'locked', branch: branchDef };

  const tierNumber = nextIndex + 1;
  const cost = profilCostForTier(tierNumber);
  if ((user.wallet || 0) < cost) return { ok: false, reason: 'not_enough', branch: branchDef, cost };

  user.wallet -= cost;
  tiers[nextIndex].done = true;
  if (tiers[nextIndex + 1]) tiers[nextIndex + 1].locked = false;

  return { ok: true, cost, branch: branchDef, tierNumber };
}

function profilEnsureSkillTree(user) {
  if (!user.skillTree) {
    user.skillTree = { pointsDispo: 0, branches: {} };
  }
  for (const b of PROFIL_TREE_BRANCHES) {
    if (!user.skillTree.branches[b.key]) {
      user.skillTree.branches[b.key] = Array.from({ length: 5 }, (_, i) => ({
        done: false,
        locked: i > 0,
      }));
    }
  }
  return user.skillTree;
}

// Réinitialise complètement l'arbre de compétences d'un joueur (aucun remboursement).
function profilResetSkillTree(user) {
  user.skillTree = { pointsDispo: 0, branches: {} };
  for (const b of PROFIL_TREE_BRANCHES) {
    user.skillTree.branches[b.key] = Array.from({ length: 5 }, (_, i) => ({
      done: false,
      locked: i > 0,
    }));
  }
}

function profilBuildTreeData(user, highlightBranch = null) {
  const tree = profilEnsureSkillTree(user);
  const branches = PROFIL_TREE_BRANCHES.map(b => ({ ...b, tiers: tree.branches[b.key] }));
  const paliersDone = branches.reduce((acc, b) => acc + b.tiers.filter(t => t.done).length, 0);
  return {
    pointsDispo: user.wallet || 0, // vtxcoins dispo pour acheter (ancien tree.pointsDispo abandonné)
    paliersDone,
    paliersTotal: branches.length * 5,
    branches,
    highlightBranch,
  };
}

function profilBuildProfileData(member, user) {
  const { expProgress, getRankForLevel } = require('../levels/levels');
  const { level, current, required } = expProgress(user.exp);
  const rank = getRankForLevel(level);

  return {
    username: member.displayName || member.user.username,
    memberSince: member.joinedAt ? member.joinedAt.toLocaleDateString('fr-FR') : '—',
    rangActuel: rank?.name || 'Vide',
    level,
    xpCurrent: current,
    xpRequired: required,
    vtxCoins: (user.wallet || 0) + (user.bank || 0),
  };
}

function profilBuildQuestComponents(user, backRowFn) {
  const rows = [backRowFn];
  const choiceIndex = user.quests.slots.findIndex(s => s.role === 'choice' && s.status === 'choice');
  if (choiceIndex === -1) return rows;

  const slot = user.quests.slots[choiceIndex];
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`pqc_${choiceIndex}`)
    .setPlaceholder('Choisis ta quête…')
    .addOptions(
      slot.options.map(opt => {
        const rewardParts = [];
        if (opt.rewardExp) rewardParts.push(`+${fmt(opt.rewardExp)} XP`);
        if (opt.rewardCoins) rewardParts.push(`+${fmt(opt.rewardCoins)} coins`);
        return {
          label: opt.label.slice(0, 100),
          description: `${opt.desc} · ${rewardParts.join(' · ')}`.slice(0, 100),
          value: opt.id,
        };
      })
    );
  rows.push(new ActionRowBuilder().addComponents(menu));
  return rows;
}

function profilInventoryToItems(user) {
  const items = [];
  if (user.inventory.tempBoost && user.inventory.tempBoost.expiresAt > Date.now()) {
    items.push({ icon: '⚡', name: user.inventory.tempBoost.label + ' (équipé)', rarityColor: '#22c55e' });
  }
  if (user.inventory.roleBoost) {
    items.push({ icon: '👑', name: user.inventory.roleBoost.label + ' (équipé)', rarityColor: '#22c55e' });
  }
  for (const b of user.inventory.tempBoostItems || []) {
    items.push({ icon: '⚡', name: b.label, rarityColor: '#6f9bd6' });
  }
  for (const b of user.inventory.roleBoostItems || []) {
    items.push({ icon: '👑', name: b.label, rarityColor: '#c9a24a' });
  }
  return items;
}

function profilBuildInventoryComponents(user, backRowFn) {
  const rows = [backRowFn];
  const tItems = user.inventory.tempBoostItems || [];
  const rItems = user.inventory.roleBoostItems || [];

  if (tItems.length > 0) {
    const row = new ActionRowBuilder();
    tItems.slice(0, 3).forEach((b, idx) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`pequip_temp_${idx}`)
          .setLabel(`⚡ Équiper : ${b.label}`.slice(0, 80))
          .setStyle(ButtonStyle.Primary)
      );
    });
    rows.push(row);
  }
  if (rItems.length > 0) {
    const row = new ActionRowBuilder();
    rItems.slice(0, 3).forEach((b, idx) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`pequip_role_${idx}`)
          .setLabel(`👑 Équiper : ${b.label}`.slice(0, 80))
          .setStyle(ButtonStyle.Success)
      );
    });
    rows.push(row);
  }
  return rows.slice(0, 5);
}

// ── Boutons de navigation ────────────────────────────────────
// Ajout du bouton "Solde" (=bal) à côté des 3 boutons existants,
// sans toucher aux autres.
function profilMainButtonsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pnav_quetes').setLabel('Quêtes').setStyle(ButtonStyle.Primary).setEmoji('🎯'),
    new ButtonBuilder().setCustomId('pnav_inventaire').setLabel('Inventaire').setStyle(ButtonStyle.Primary).setEmoji('🎒'),
    new ButtonBuilder().setCustomId('pnav_arbre').setLabel('Arbre').setStyle(ButtonStyle.Success).setEmoji('🌳'),
    new ButtonBuilder().setCustomId('pnav_bal').setLabel('Solde').setStyle(ButtonStyle.Secondary).setEmoji('💰'),
  );
}
function profilBackRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pnav_profil').setLabel('◀ Retour').setStyle(ButtonStyle.Secondary),
  );
}

// ── Vue : Arbre de compétences (select menu + Débloquer/Rafraîchir/Retour) ──
function profilArbreComponents(user, selectedBranchKey) {
  const tree = profilEnsureSkillTree(user);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('parbre_select')
    .setPlaceholder('Branche (prochain achat)')
    .addOptions(
      PROFIL_TREE_BRANCHES.map(b => {
        const tiers = tree.branches[b.key];
        const done = tiers.filter(t => t.done).length;
        return {
          label: b.label,
          value: b.key,
          description: `Palier ${done}/${tiers.length}`,
          default: selectedBranchKey === b.key,
        };
      })
    );

  const nextInfo = selectedBranchKey ? profilNextTierInfo(user, selectedBranchKey) : null;

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('parbre_unlock')
      .setLabel('Débloquer')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✨')
      .setDisabled(!nextInfo || !nextInfo.canBuy),
    new ButtonBuilder()
      .setCustomId('parbre_refresh')
      .setLabel('Rafraîchir')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId('pnav_profil')
      .setLabel('◀ Retour')
      .setStyle(ButtonStyle.Secondary),
  );

  return [new ActionRowBuilder().addComponents(selectMenu), buttonRow];
}

// Calcule où en est le joueur sur la branche sélectionnée (prochain coût, si achetable, etc.)
function profilNextTierInfo(user, branchKey) {
  const branchDef = PROFIL_TREE_BRANCHES.find(b => b.key === branchKey);
  const tree = profilEnsureSkillTree(user);
  const tiers = tree.branches[branchKey];
  const nextIndex = tiers.findIndex(t => !t.done);

  if (nextIndex === -1) return { branch: branchDef, maxed: true, canBuy: false };

  const tierNumber = nextIndex + 1;
  const cost = profilCostForTier(tierNumber);
  const locked = tiers[nextIndex].locked;
  const canBuy = !locked && (user.wallet || 0) >= cost;
  return { branch: branchDef, tierNumber, cost, locked, canBuy, maxed: false };
}

// Texte affiché au-dessus de l'image de l'arbre (points dispo + info palier sélectionné)
function profilArbreContent(user, selectedBranchKey) {
  let text = `**Points dispo :** ${fmt(user.wallet || 0)} ${COIN}\nChoisis une **branche** puis **Débloquer**.`;
  if (!selectedBranchKey) return text;

  const info = profilNextTierInfo(user, selectedBranchKey);
  if (info.maxed) {
    text += `\n\n✅ **${info.branch.label}** est déjà au palier maximum (5/5).`;
  } else if (info.locked) {
    text += `\n\n🔒 **${info.branch.label}** — palier ${info.tierNumber} verrouillé (débloque le précédent d'abord).`;
  } else {
    const missing = info.cost - (user.wallet || 0);
    text += `\n\n➡️ **${info.branch.label}** — palier ${info.tierNumber}/5 pour **${fmt(info.cost)} vtxcoins** ${COIN}`;
    if (!info.canBuy) text += `\n${PERDU} Il te manque **${fmt(missing)}** ${COIN}.`;
  }
  return text;
}

// ── =profil [@mention] ───────────────────────────────────────
async function cmdProfil(msg) {
  const target = msg.mentions.users.first() ?? msg.author;
  const member = await msg.guild.members.fetch(target.id).catch(() => null);
  if (!member) return msg.reply(re(0xef4444, `${PERDU} Membre introuvable.`));

  const { ensureQuestSlots, chooseQuest } = require('../levels/quests');
  const { generateProfile, generateQuests, generateInventory, generateSkillTree, generateBal } = require('../levels/tasks/cardsGen');

  const user = getUser(target.id);
  ensureQuestSlots(user);
  profilEnsureSkillTree(user);
  saveUser(user);

  const profileBuffer = await generateProfile(member, profilBuildProfileData(member, user));
  const reply = await msg.reply({
    files: [new AttachmentBuilder(profileBuffer, { name: 'profil.png' })],
    components: [profilMainButtonsRow()],
  });

  // Navigation interactive réservée à l'auteur de la commande
  if (target.id !== msg.author.id) return;

  // Mémorise la branche sélectionnée dans le select menu de l'arbre, tant que
  // ce message de profil reste ouvert (perdu si le message expire, c'est normal).
  let profilArbreSelection = null;

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === msg.author.id,
    time: 15 * 60 * 1000,
  });

  collector.on('collect', async i => {
    const freshUser = getUser(msg.author.id);

    // NOTE : le deferUpdate() est fait au cas par cas, juste avant chaque
    // génération de canvas — jamais avant les branches qui répondent par un
    // message éphémère (i.reply), sinon ces réponses éphémères planteraient.
    // Ça évite le "flash" / la disparition de l'image : Discord considère
    // l'interaction comme acquittée dès le deferUpdate(), donc plus jamais
    // de timeout de 3s pendant la génération du canvas.

    try {
      if (i.customId === 'pnav_profil') {
        await i.deferUpdate();
        const buf = await generateProfile(member, profilBuildProfileData(member, freshUser));
        return i.editReply({
          files: [new AttachmentBuilder(buf, { name: 'profil.png' })],
          attachments: [],
          components: [profilMainButtonsRow()],
        });
      }

      if (i.customId === 'pnav_quetes') {
        await i.deferUpdate();
        const buf = await generateQuests(member, freshUser.quests.slots);
        return i.editReply({
          files: [new AttachmentBuilder(buf, { name: 'quetes.png' })],
          attachments: [],
          components: profilBuildQuestComponents(freshUser, profilBackRow()),
        });
      }

      if (i.customId === 'pnav_inventaire') {
        await i.deferUpdate();
        const buf = await generateInventory(member, profilInventoryToItems(freshUser));
        return i.editReply({
          files: [new AttachmentBuilder(buf, { name: 'inventaire.png' })],
          attachments: [],
          components: profilBuildInventoryComponents(freshUser, profilBackRow()),
        });
      }

      if (i.customId === 'pnav_arbre') {
        await i.deferUpdate();
        profilArbreSelection = null;
        const buf = await generateSkillTree(member, profilBuildTreeData(freshUser, null));
        return i.editReply({
          content: profilArbreContent(freshUser, null),
          files: [new AttachmentBuilder(buf, { name: 'arbre.png' })],
          attachments: [],
          components: profilArbreComponents(freshUser, null),
        });
      }

      // ── Arbre : choix d'une branche dans le select menu ──
      if (i.customId === 'parbre_select' && i.isStringSelectMenu()) {
        await i.deferUpdate();
        profilArbreSelection = i.values[0];
        const buf = await generateSkillTree(member, profilBuildTreeData(freshUser, profilArbreSelection));
        return i.editReply({
          content: profilArbreContent(freshUser, profilArbreSelection),
          files: [new AttachmentBuilder(buf, { name: 'arbre.png' })],
          attachments: [],
          components: profilArbreComponents(freshUser, profilArbreSelection),
        });
      }

      // ── Arbre : bouton Rafraîchir (redessine sans rien changer) ──
      if (i.customId === 'parbre_refresh') {
        await i.deferUpdate();
        const buf = await generateSkillTree(member, profilBuildTreeData(freshUser, profilArbreSelection));
        return i.editReply({
          content: profilArbreContent(freshUser, profilArbreSelection),
          files: [new AttachmentBuilder(buf, { name: 'arbre.png' })],
          attachments: [],
          components: profilArbreComponents(freshUser, profilArbreSelection),
        });
      }

      // ── Arbre : bouton Débloquer (dépense les vtxcoins du wallet) ──
      if (i.customId === 'parbre_unlock') {
        if (!profilArbreSelection) {
          return i.reply({ content: 'Choisis une branche dans le menu avant de débloquer.', ephemeral: true }).catch(() => {});
        }

        const result = profilUnlockNextTier(freshUser, profilArbreSelection);
        if (!result.ok) {
          const msgByReason = {
            maxed: `${result.branch.label} est déjà au palier maximum.`,
            locked: `Ce palier de ${result.branch.label} est verrouillé.`,
            not_enough: `Il te faut **${fmt(result.cost)}** vtxcoins ${COIN} pour ce palier (tu en as ${fmt(freshUser.wallet || 0)}).`,
            branch_not_found: 'Branche introuvable.',
          };
          return i.reply({ content: msgByReason[result.reason] || 'Achat impossible.', ephemeral: true }).catch(() => {});
        }

        await i.deferUpdate();
        saveUser(freshUser);
        const buf = await generateSkillTree(member, profilBuildTreeData(freshUser, profilArbreSelection));
        return i.editReply({
          content: profilArbreContent(freshUser, profilArbreSelection),
          files: [new AttachmentBuilder(buf, { name: 'arbre.png' })],
          attachments: [],
          components: profilArbreComponents(freshUser, profilArbreSelection),
        });
      }

      if (i.customId === 'pnav_bal') {
        await i.deferUpdate();
        const buf = await generateBal(member, freshUser);
        return i.editReply({
          files: [new AttachmentBuilder(buf, { name: 'bal.png' })],
          attachments: [],
          components: [profilBackRow()],
        });
      }

      if (i.customId.startsWith('pqc_') && i.isStringSelectMenu()) {
        const slotIndex = parseInt(i.customId.split('_')[1], 10);
        const questId = i.values[0];
        const picked = chooseQuest(freshUser, slotIndex, questId);
        if (!picked) return i.reply({ content: "Cette quête n'est plus disponible.", ephemeral: true }).catch(() => {});

        await i.deferUpdate();
        const buf = await generateQuests(member, freshUser.quests.slots);
        return i.editReply({
          files: [new AttachmentBuilder(buf, { name: 'quetes.png' })],
          attachments: [],
          components: profilBuildQuestComponents(freshUser, profilBackRow()),
        });
      }

      if (i.customId.startsWith('pequip_temp_')) {
        const idx = parseInt(i.customId.replace('pequip_temp_', ''), 10);
        const items = freshUser.inventory.tempBoostItems || [];
        if (!items[idx]) return i.reply({ content: '❌ Boost introuvable.', ephemeral: true }).catch(() => {});

        await i.deferUpdate();
        const boost = items[idx];
        freshUser.inventory.tempBoost = { ...boost, expiresAt: Date.now() + boost.duration * 60_000 };
        items.splice(idx, 1);
        freshUser.inventory.tempBoostItems = items;
        saveUser(freshUser);

        const buf = await generateInventory(member, profilInventoryToItems(freshUser));
        return i.editReply({
          files: [new AttachmentBuilder(buf, { name: 'inventaire.png' })],
          attachments: [],
          components: profilBuildInventoryComponents(freshUser, profilBackRow()),
        });
      }

      if (i.customId.startsWith('pequip_role_')) {
        const idx = parseInt(i.customId.replace('pequip_role_', ''), 10);
        const items = freshUser.inventory.roleBoostItems || [];
        if (!items[idx]) return i.reply({ content: '❌ Boost introuvable.', ephemeral: true }).catch(() => {});

        await i.deferUpdate();
        const boost = items[idx];
        if (freshUser.inventory.roleBoost?.roleId) {
          const oldRole = msg.guild.roles.cache.get(freshUser.inventory.roleBoost.roleId);
          if (oldRole) await member.roles.remove(oldRole).catch(() => {});
        }
        freshUser.inventory.roleBoost = { ...boost };
        items.splice(idx, 1);
        freshUser.inventory.roleBoostItems = items;
        saveUser(freshUser);

        if (boost.roleId) {
          const newRole = msg.guild.roles.cache.get(boost.roleId);
          if (newRole) await member.roles.add(newRole).catch(() => {});
        }

        const buf = await generateInventory(member, profilInventoryToItems(freshUser));
        return i.editReply({
          files: [new AttachmentBuilder(buf, { name: 'inventaire.png' })],
          attachments: [],
          components: profilBuildInventoryComponents(freshUser, profilBackRow()),
        });
      }
    } catch (e) {
      console.error('[Prefix] profil collector:', e.message);
    }
  });

  collector.on('end', () => {
    reply.edit({ components: [] }).catch(() => {});
  });
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
        await reply.edit({ files: [new AttachmentBuilder(newBuffer, { name: 'top.png' })], attachments: [], components: [topRow(mode)] });
      } catch(e) { console.error('[Top] bouton:', e.message); }
    });
    collector.on('end', () => reply.edit({ components: [] }).catch(() => {}));
  } catch(e) {
    console.error('[Prefix] top:', e.message);
    msg.reply(re(0xef4444, `${PERDU} Erreur lors de la génération du classement.`));
  }
}

// ── =quetes ──────────────────────────────────────────────────
// Utilise le même système que la slash command /quetes : 3 slots
// (quotidienne + hebdo auto, à choix via select menu).
function buildQuestComponents(user) {
  const choiceIndex = user.quests.slots.findIndex(s => s.role === 'choice' && s.status === 'choice');
  if (choiceIndex === -1) return [];

  const slot = user.quests.slots[choiceIndex];
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`qc_${choiceIndex}`)
    .setPlaceholder('Choisis ta quête…')
    .addOptions(
      slot.options.map(opt => {
        const rewardParts = [];
        if (opt.rewardExp)   rewardParts.push(`+${fmt(opt.rewardExp)} XP`);
        if (opt.rewardCoins) rewardParts.push(`+${fmt(opt.rewardCoins)} coins`);
        return {
          label: opt.label.slice(0, 100),
          description: `${opt.desc} · ${rewardParts.join(' · ')}`.slice(0, 100),
          value: opt.id,
        };
      })
    );

  return [new ActionRowBuilder().addComponents(menu)];
}

async function cmdQuetes(msg) {
  try {
    const { ensureQuestSlots, chooseQuest } = require('../levels/quests');
    const { generateQuests }                = require('../levels/canvas');

    const member = await msg.guild.members.fetch(msg.author.id).catch(() => null);
    if (!member) return msg.reply(re(0xef4444, `${PERDU} Membre introuvable.`));

    const user = getUser(msg.author.id);
    ensureQuestSlots(user);
    saveUser(user);

    const buffer      = await generateQuests(member, user.quests.slots);
    const components   = buildQuestComponents(user);
    const reply = await msg.reply({ files: [new AttachmentBuilder(buffer, { name: 'quetes.png' })], components });

    if (!components.length) return;

    const collector = reply.createMessageComponentCollector({
      filter: i => i.user.id === msg.author.id && i.customId.startsWith('qc_') && i.isStringSelectMenu(),
      time: 15 * 60 * 1000,
    });

    collector.on('collect', async i => {
      const slotIndex = parseInt(i.customId.split('_')[1], 10);
      const questId   = i.values[0];

      const freshUser = getUser(msg.author.id);
      const picked = chooseQuest(freshUser, slotIndex, questId);
      if (!picked) {
        return i.reply({ content: 'Cette quête n\'est plus disponible.', ephemeral: true }).catch(() => {});
      }

      // Acquittement immédiat AVANT la génération du canvas, pour éviter le
      // "flash" d'image si generateQuests met plus de 3s.
      await i.deferUpdate();

      const newBuffer     = await generateQuests(member, freshUser.quests.slots);
      const newComponents = buildQuestComponents(freshUser);
      await i.editReply({
        files: [new AttachmentBuilder(newBuffer, { name: 'quetes.png' })],
        attachments: [],
        components: newComponents,
      });
    });

    collector.on('end', () => reply.edit({ components: [] }).catch(() => {}));
  } catch(e) {
    console.error('[Prefix] quetes:', e.message);
    msg.reply(re(0xef4444, `${PERDU} Erreur lors de la génération des quêtes.`));
  }
}

// ── =resetquetes @membre|all ──────────────────────────────────
async function cmdResetQuetes(msg, args) {
  const isAdmin = msg.member.permissions.has('Administrator');
  if (!isAdmin) return msg.reply(re(0xef4444, `${PERDU} Réservé aux administrateurs.`));

  const { resetQuestSlots } = require('../levels/quests');
  const target = args[0]?.toLowerCase();

  if (target === 'all' || target === 'tout') {
    const { getAllUsers } = require('../levels/db');
    const allUsers = getAllUsers();
    let count = 0;
    for (const user of Object.values(allUsers)) {
      resetQuestSlots(user);
      saveUser(user);
      count++;
    }
    return msg.reply(re(0x22c55e, `${CHECK} Quêtes réinitialisées pour **${count}** membres.`));
  }

  const mentioned = msg.mentions.users.first();
  if (!mentioned) return msg.reply(re(0xef4444, `${PERDU} Usage : \`=resetquetes @membre\` ou \`=resetquetes all\`.`));

  const user = getUser(mentioned.id);
  resetQuestSlots(user);
  saveUser(user);
  msg.reply(re(0x22c55e, `${CHECK} Quêtes réinitialisées pour **${mentioned.username}**.`));
}

// ── =resetarbre @membre|all ─────────────────────────────────
async function cmdResetArbre(msg, args) {
  const isAdmin = msg.member.permissions.has('Administrator');
  if (!isAdmin) return msg.reply(re(0xef4444, `${PERDU} Réservé aux administrateurs.`));

  const target = args[0]?.toLowerCase();

  if (target === 'all' || target === 'tout') {
    const { getAllUsers } = require('../levels/db');
    const allUsers = getAllUsers();
    let count = 0;
    for (const user of Object.values(allUsers)) {
      profilResetSkillTree(user);
      saveUser(user);
      count++;
    }
    return msg.reply(re(0x22c55e, `${CHECK} Arbre de compétences réinitialisé pour **${count}** membres.`));
  }

  const mentioned = msg.mentions.users.first();
  if (!mentioned) return msg.reply(re(0xef4444, `${PERDU} Usage : \`=resetarbre @membre\` ou \`=resetarbre all\`.`));

  const user = getUser(mentioned.id);
  profilResetSkillTree(user);
  saveUser(user);
  msg.reply(re(0x22c55e, `${CHECK} Arbre de compétences réinitialisé pour **${mentioned.username}**.`));
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
      { name: '🎵 Musique (vocal)', value: 'Parle au bot en étant en vocal :\n« vtxbot rejoins le vocal » — Le bot rejoint ton salon\n« vtxbot mets *titre*» — Joue/ajoute une musique\n« vtxbot pause / reprends / skip / stop » — Contrôle la lecture\n« vtxbot quitte le vocal » — Déconnexion' },
      ...(isStaff ? [{ name: '🎫 Tickets (staff)', value: '`-delete` — Transcript + supprimer\n`vtxbot [action]` — IA modération' }] : []),
      ...(isStaff ? [{ name: '🎰 Modération Casino (staff)', value: '`=bancasino @membre <perm|durée> [raison]` — Bannir du casino (ex : `7j`, `12h`, `30min`)\n`=debancasino @membre` — Débannir du casino' }] : []),
      ...(isAdmin ? [{ name: '🛡️ Admin', value: '`/adminexpajouter` `/adminexpretirer` `/adminmoneyajouter` `/adminmoneyretirer`\n`/adminpersos add @m <perso>` — Donner un perso\n`/adminpersos remove @m <perso>` — Retirer un perso\n`/adminpersos list @m` — Lister les persos\n`/adminpersos resetcd @m [perso]` — Reset cooldowns\n`=admindonnerperso @m <perso>` · `=adminretirerperso @m <perso>` · `=adminlisterpersos @m`\n`=testsaison` — Aperçu de l\'annonce de fin de saison (sans reset)\n`=maintenance` — Activer la maintenance pour une ou plusieurs catégories (EXP, économie, casino, persos, staff)\n`=finmaintenance` — Désactiver toute la maintenance\n`=resetquetes @membre|all` — Réinitialiser les quêtes\n`=resetarbre @membre|all` — Réinitialiser l\'arbre de compétences' }] : []),
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
    default:    return n * 60 * 1000;
  }
}

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

async function cmdTestSaison(msg) {
  if (!msg.member.permissions.has('Administrator')) return msg.reply(re(0xef4444, `${PERDU} Réservé aux administrateurs.`));
  const { previewSeasonEnd } = require('../levels/seasons');
  await previewSeasonEnd(msg.client, msg.channel.id);
  msg.reply(re(0x22c55e, `${CHECK} Aperçu de fin de saison posté ici (aucune donnée réinitialisée).`));
}

function buildMaintenanceEmbed(active) {
  const { CATEGORIES } = require('../levels/maintenance');
  const lines = Object.entries(CATEGORIES).map(([key, c]) => {
    const status = active.includes(key) ? '🔴 En maintenance' : '🟢 Actif';
    return `${c.emoji} **${c.label}** — ${status}\n> ${c.desc}`;
  });
  return new EmbedBuilder().setColor(0x7c5cfc)
    .setTitle('🚧 Mode maintenance')
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: 'Sélectionne les catégories à mettre en maintenance ci-dessous · =finmaintenance pour tout réactiver' });
}

function buildMaintenanceRow(active) {
  const { CATEGORIES } = require('../levels/maintenance');
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('maintenance_select')
      .setPlaceholder('Catégories à mettre en maintenance...')
      .setMinValues(0)
      .setMaxValues(Object.keys(CATEGORIES).length)
      .addOptions(Object.entries(CATEGORIES).map(([key, c]) => ({
        label: c.label,
        value: key,
        emoji: c.emoji,
        default: active.includes(key),
      })))
  );
}

async function cmdMaintenance(msg) {
  if (!msg.member.permissions.has('Administrator'))
    return msg.reply(re(0xef4444, `${PERDU} Réservé aux administrateurs.`));

  const { getActive, setActive } = require('../levels/maintenance');
  let active = getActive();
  const reply = await msg.reply({ embeds: [buildMaintenanceEmbed(active)], components: [buildMaintenanceRow(active)] });

  const collector = reply.createMessageComponentCollector({ time: 5 * 60_000 });
  collector.on('collect', async sel => {
    if (sel.user.id !== msg.author.id)
      return sel.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`${PERDU} Seul l'auteur de la commande peut modifier ceci.`)], ephemeral: true });
    active = sel.values;
    setActive(active);
    await sel.update({ embeds: [buildMaintenanceEmbed(active)], components: [buildMaintenanceRow(active)] });
  });
  collector.on('end', () => reply.edit({ components: [] }).catch(() => {}));
}

async function cmdFinMaintenance(msg) {
  if (!msg.member.permissions.has('Administrator'))
    return msg.reply(re(0xef4444, `${PERDU} Réservé aux administrateurs.`));
  const { clear } = require('../levels/maintenance');
  clear();
  msg.reply(re(0x22c55e, `${CHECK} Maintenance désactivée pour toutes les catégories.`));
}

const CMDS = {
  dep: cmdDep, with: cmdWith, bal: cmdBal, donner: cmdDonner,
  rob: cmdRob, work: cmdWork, profil: cmdProfil, top: cmdTop,
  quetes: cmdQuetes, resetquetes: cmdResetQuetes, aide: cmdAide,
  createroles: cmdCreateRoles,
  bancasino: cmdBanCasino, debancasino: cmdDebanCasino,
  testsaison: cmdTestSaison,
  maintenance: cmdMaintenance, finmaintenance: cmdFinMaintenance,
  resetarbre: cmdResetArbre,
};

const MAINT_CAT = {
  dep: 'economie', with: 'economie', donner: 'economie', rob: 'economie', work: 'economie',
  bancasino: 'staff', debancasino: 'staff', createroles: 'staff', testsaison: 'staff',
};

const QUEST_COMMAND_EXCLUDED = [
  'quetes', 'profil', 'top', 'aide', 'resetquetes',
  'createroles', 'bancasino', 'debancasino', 'testsaison',
  'maintenance', 'finmaintenance', 'resetarbre',
];

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
      const maintCat = MAINT_CAT[name];
      if (maintCat) {
        const { isActive, maintenanceReply } = require('../levels/maintenance');
        if (isActive(maintCat)) return msg.reply(maintenanceReply(maintCat));
      }
      try {
        await handler(msg, args);

        if (!QUEST_COMMAND_EXCLUDED.includes(name)) {
          const { getUser, saveUser }             = require('../levels/db');
          const { resetDailyStatsIfNeeded }        = require('../levels/levels');
          const { generateDailyQuests, updateQuestProgress } = require('../levels/quests');

          const user = getUser(msg.author.id);
          generateDailyQuests(user);
          resetDailyStatsIfNeeded(user);
          user.dailyStats.commands++;
          saveUser(user);
          updateQuestProgress(msg.guild, msg.author.id, 'commands', 1).catch(() => {});
        }
      } catch(e) { console.error('[Prefix]', e.message); }
    });
    console.log('[Prefix] ✅ =dep =with =bal =donner =rob =work =profil =top =quetes =resetquetes =resetarbre =aide =bancasino =debancasino =testsaison =maintenance =finmaintenance');
  },
};