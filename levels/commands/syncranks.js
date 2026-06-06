'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { RANKS } = require('../config');
const { getAllUsers } = require('../db');
const { levelFromExp, getRankForLevel } = require('../levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('syncranks')
    .setDescription('[ADMIN] Synchronise les rôles de rang de tous les membres avec leur XP actuelle')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const guild = interaction.guild;
    const db    = getAllUsers();

    // Pré-charger tous les membres
    await guild.members.fetch().catch(() => {});

    const rankRoleIds = new Set(RANKS.map(r => r.roleId));

    let synced = 0, errors = 0;

    for (const [userId, userData] of Object.entries(db)) {
      const member = guild.members.cache.get(userId);
      if (!member) continue;

      const level      = levelFromExp(userData.exp || 0);
      const correctRank = getRankForLevel(level);

      try {
        // Retirer tous les rôles de rang incorrects
        for (const rankRoleId of rankRoleIds) {
          if (correctRank?.roleId === rankRoleId) continue;
          if (member.roles.cache.has(rankRoleId)) {
            const role = guild.roles.cache.get(rankRoleId);
            if (role) await member.roles.remove(role).catch(() => {});
          }
        }

        // Ajouter le bon rang s'il manque
        if (correctRank && !member.roles.cache.has(correctRank.roleId)) {
          const role = guild.roles.cache.get(correctRank.roleId);
          if (role) await member.roles.add(role).catch(() => {});
        }

        synced++;
      } catch {
        errors++;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Sync des rangs terminée')
      .setColor(0x7c5cfc)
      .setDescription(
        `**${synced}** membre(s) synchronisé(s)\n` +
        (errors ? `⚠️ ${errors} erreur(s)` : '')
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
