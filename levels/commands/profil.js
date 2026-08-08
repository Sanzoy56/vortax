'use strict';

const {
  SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
} = require('discord.js');
const { getUser, saveUser } = require('../db');
const { ensureQuestSlots, chooseQuest } = require('../quests');
const { generateProfile, generateQuests, generateInventory, generateSkillTree } = require('../canvas');
const { expProgress, getRankForLevel, fmt } = require('../levels');
const { SKILL_TREE } = require('../config');

// ── Arbre de compétences ─────────────────────────────────────────────────
// FIX : structure minimale pour que l'arbre existe côté data. Pas encore de
// logique de dépense de points (achat de palier) — juste l'affichage pour
// l'instant, comme demandé. À brancher plus tard sur un vrai système de
// points gagnés (niveau ? quêtes ? à définir).
const TREE_BRANCHES = [
  { key: 'quete',     label: 'QUÊTE',      color: '#6fae7f', icon: '⚔' },
  { key: 'guilde',    label: 'GUILDE',     color: '#9585c9', icon: '⚜' },
  { key: 'boutique',  label: 'BOUTIQUE',   color: '#c9a24a', icon: '◆' },
  { key: 'ranked',    label: 'RANKED',     color: '#6f9bd6', icon: '★' },
  { key: 'evenement', label: 'ÉVÉNEMENT',  color: '#c9a24a', icon: '✦' },
];

// Coût VTX-Coins par palier (même barème pour chaque branche) — configuré
// dans config.js (SKILL_TREE.PALIER_COSTS), crescendo 200K → 8M.
const PALIER_COSTS = SKILL_TREE.PALIER_COSTS;

function ensureSkillTree(user) {
  if (!user.skillTree) {
    user.skillTree = {
      pointsDispo: 0,
      branches: {}, // key -> [{done:false, locked:true}, x5]
    };
  }
  for (const b of TREE_BRANCHES) {
    if (!user.skillTree.branches[b.key]) {
      user.skillTree.branches[b.key] = Array.from({ length: 5 }, (_, i) => ({
        done: false,
        locked: i > 0, // seul le 1er palier de chaque branche est déverrouillé par défaut
      }));
    }
  }
  return user.skillTree;
}

function buildTreeData(user) {
  const tree = ensureSkillTree(user);
  const branches = TREE_BRANCHES.map(b => ({
    ...b,
    tiers: tree.branches[b.key].map((tier, i) => ({
      ...tier,
      cost: PALIER_COSTS[i] ?? null,
    })),
  }));
  const paliersDone = branches.reduce((acc, b) => acc + b.tiers.filter(t => t.done).length, 0);
  return {
    pointsDispo: tree.pointsDispo,
    paliersDone,
    paliersTotal: branches.length * 5,
    branches,
  };
}

// ── Données du profil ────────────────────────────────────────────────────
// FIX : mapping à confirmer avec la vraie base. `wallet`/`bank`/`exp` viennent
// du modèle existant (levels.js) ; `starss`, `pointsRP`, `guildeName` n'ont
// pas encore d'équivalent connu → 0 / '—' par défaut en attendant.
function buildProfileData(member, user) {
  const { level, current, required } = expProgress(user.exp);
  const rank = getRankForLevel(level);

  return {
    username: member.displayName || member.user.username,
    memberSince: member.joinedAt
      ? member.joinedAt.toLocaleDateString('fr-FR')
      : '—',
    starss: user.starss ?? 0,
    pointsRP: user.pointsRP ?? 0,
    rangActuel: rank?.name || 'Vide',
    level,
    xpCurrent: current,
    xpRequired: required,
    tresorerie: user.bank != null ? fmt(user.bank) : '—',
    guildeName: user.guildeName || null,
  };
}

// ── Vue : Quêtes ─────────────────────────────────────────────────────────
function buildQuestComponents(user, backRow) {
  const rows = [backRow];
  const choiceIndex = user.quests.slots.findIndex(s => s.role === 'choice' && s.status === 'choice');
  if (choiceIndex === -1) return rows;

  const slot = user.quests.slots[choiceIndex];
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`qc_${choiceIndex}`)
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

// ── Vue : Inventaire ─────────────────────────────────────────────────────
// Convertit les boosts (structure existante inventaire.js) en items pour
// generateInventory (icône/nom/qty). Équiper reste géré par boutons Discord
// classiques en dessous de l'image (pas dans le canvas).
function inventoryToItems(user) {
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

function buildInventoryComponents(user, backRow) {
  const rows = [backRow];
  const tItems = user.inventory.tempBoostItems || [];
  const rItems = user.inventory.roleBoostItems || [];

  if (tItems.length > 0) {
    const row = new ActionRowBuilder();
    tItems.slice(0, 3).forEach((b, idx) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`equip_temp_${idx}`)
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
          .setCustomId(`equip_role_${idx}`)
          .setLabel(`👑 Équiper : ${b.label}`.slice(0, 80))
          .setStyle(ButtonStyle.Success)
      );
    });
    rows.push(row);
  }
  return rows.slice(0, 5);
}

// ── Boutons de navigation ────────────────────────────────────────────────
function mainButtonsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav_quetes').setLabel('Quêtes').setStyle(ButtonStyle.Primary).setEmoji('🎯'),
    new ButtonBuilder().setCustomId('nav_inventaire').setLabel('Inventaire').setStyle(ButtonStyle.Primary).setEmoji('🎒'),
    new ButtonBuilder().setCustomId('nav_arbre').setLabel('Arbre').setStyle(ButtonStyle.Success).setEmoji('🌳'),
  );
}
function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav_profil').setLabel('◀ Retour').setStyle(ButtonStyle.Secondary),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Ta carte de profil (quêtes, inventaire, arbre de compétences)'),

  async execute(interaction) {
    await interaction.deferReply();

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return interaction.editReply('❌ Erreur membre.');

    const user = getUser(interaction.user.id);
    ensureQuestSlots(user);
    ensureSkillTree(user);
    saveUser(user);

    const profileBuffer = await generateProfile(member, buildProfileData(member, user));
    const reply = await interaction.editReply({
      files: [new AttachmentBuilder(profileBuffer, { name: 'profil.png' })],
      components: [mainButtonsRow()],
    });

    const collector = reply.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 15 * 60 * 1000, // 15 min
    });

    collector.on('collect', async i => {
      const freshUser = getUser(interaction.user.id);

      // NOTE : deferUpdate() est fait au cas par cas, juste avant chaque
      // génération de canvas — jamais avant les branches qui répondent par un
      // message éphémère (i.reply), sinon ces réponses éphémères planteraient.
      // Ça évite le "flash" / la disparition de l'image le temps que le
      // canvas se génère : l'interaction est acquittée dès le deferUpdate(),
      // donc plus de timeout Discord de 3s pendant l'attente.

      try {
        // ── Navigation ──
        if (i.customId === 'nav_profil') {
          await i.deferUpdate();
          const buf = await generateProfile(member, buildProfileData(member, freshUser));
          return i.editReply({
            files: [new AttachmentBuilder(buf, { name: 'profil.png' })],
            attachments: [],
            components: [mainButtonsRow()],
          });
        }

        if (i.customId === 'nav_quetes') {
          await i.deferUpdate();
          const buf = await generateQuests(member, freshUser.quests.slots);
          return i.editReply({
            files: [new AttachmentBuilder(buf, { name: 'quetes.png' })],
            attachments: [],
            components: buildQuestComponents(freshUser, backRow()),
          });
        }

        if (i.customId === 'nav_inventaire') {
          await i.deferUpdate();
          const buf = await generateInventory(member, inventoryToItems(freshUser));
          return i.editReply({
            files: [new AttachmentBuilder(buf, { name: 'inventaire.png' })],
            attachments: [],
            components: buildInventoryComponents(freshUser, backRow()),
          });
        }

        if (i.customId === 'nav_arbre') {
          await i.deferUpdate();
          const buf = await generateSkillTree(member, buildTreeData(freshUser));
          return i.editReply({
            files: [new AttachmentBuilder(buf, { name: 'arbre.png' })],
            attachments: [],
            components: [backRow()],
          });
        }

        // ── Choix de quête (menu déroulant) ──
        if (i.customId.startsWith('qc_') && i.isStringSelectMenu()) {
          const slotIndex = parseInt(i.customId.split('_')[1], 10);
          const questId = i.values[0];
          const picked = chooseQuest(freshUser, slotIndex, questId);
          if (!picked) return i.reply({ content: "Cette quête n'est plus disponible.", ephemeral: true }).catch(() => {});

          await i.deferUpdate();
          const buf = await generateQuests(member, freshUser.quests.slots);
          return i.editReply({
            files: [new AttachmentBuilder(buf, { name: 'quetes.png' })],
            attachments: [],
            components: buildQuestComponents(freshUser, backRow()),
          });
        }

        // ── Équiper un boost (inventaire) ──
        if (i.customId.startsWith('equip_temp_')) {
          const idx = parseInt(i.customId.replace('equip_temp_', ''), 10);
          const items = freshUser.inventory.tempBoostItems || [];
          if (!items[idx]) return i.reply({ content: '❌ Boost introuvable.', ephemeral: true }).catch(() => {});

          await i.deferUpdate();
          const boost = items[idx];
          freshUser.inventory.tempBoost = { ...boost, expiresAt: Date.now() + boost.duration * 60_000 };
          items.splice(idx, 1);
          freshUser.inventory.tempBoostItems = items;
          saveUser(freshUser);

          const buf = await generateInventory(member, inventoryToItems(freshUser));
          return i.editReply({
            files: [new AttachmentBuilder(buf, { name: 'inventaire.png' })],
            attachments: [],
            components: buildInventoryComponents(freshUser, backRow()),
          });
        }

        if (i.customId.startsWith('equip_role_')) {
          const idx = parseInt(i.customId.replace('equip_role_', ''), 10);
          const items = freshUser.inventory.roleBoostItems || [];
          if (!items[idx]) return i.reply({ content: '❌ Boost introuvable.', ephemeral: true }).catch(() => {});

          await i.deferUpdate();
          const boost = items[idx];
          if (freshUser.inventory.roleBoost?.roleId) {
            const oldRole = interaction.guild.roles.cache.get(freshUser.inventory.roleBoost.roleId);
            if (oldRole) await member.roles.remove(oldRole).catch(() => {});
          }
          freshUser.inventory.roleBoost = { ...boost };
          items.splice(idx, 1);
          freshUser.inventory.roleBoostItems = items;
          saveUser(freshUser);

          if (boost.roleId) {
            const newRole = interaction.guild.roles.cache.get(boost.roleId);
            if (newRole) await member.roles.add(newRole).catch(() => {});
          }

          const buf = await generateInventory(member, inventoryToItems(freshUser));
          return i.editReply({
            files: [new AttachmentBuilder(buf, { name: 'inventaire.png' })],
            attachments: [],
            components: buildInventoryComponents(freshUser, backRow()),
          });
        }
      } catch (e) {
        console.error('[Profil] collector:', e.message);
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};