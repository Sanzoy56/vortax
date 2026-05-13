const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, saveUser } = require('../db');
const { fmt } = require('../levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription('Voir et gérer ton inventaire de boosts'),

  async execute(interaction) {
    const user = getUser(interaction.user.id);

    const tempItems = user.inventory.tempBoostItems || [];
    const roleItems = user.inventory.roleBoostItems || [];

    // Nettoyer les boosts temp expirés
    const now         = Date.now();
    const activeTempEquipped = user.inventory.tempBoost && user.inventory.tempBoost.expiresAt > now
      ? user.inventory.tempBoost : null;

    function buildEmbed() {
      const u = getUser(interaction.user.id);
      const embed = new EmbedBuilder()
        .setTitle('🎒 Inventaire')
        .setColor(0x7c5cfc)
        .setDescription(`Un seul boost de chaque catégorie peut être équipé à la fois.`);

      // ─── Boost temporaire équipé ─────────────────────────
      if (u.inventory.tempBoost && u.inventory.tempBoost.expiresAt > Date.now()) {
        const remaining = Math.ceil((u.inventory.tempBoost.expiresAt - Date.now()) / 60_000);
        embed.addFields({ name: '⚡ Boost Temporaire équipé', value: `**${u.inventory.tempBoost.label}** — ${remaining} min restantes`, inline: false });
      } else {
        embed.addFields({ name: '⚡ Boost Temporaire équipé', value: '*Aucun*', inline: false });
      }

      // ─── Rôle boost équipé ───────────────────────────────
      if (u.inventory.roleBoost) {
        embed.addFields({ name: '👑 Rôle Boost équipé', value: `**${u.inventory.roleBoost.label}**`, inline: false });
      } else {
        embed.addFields({ name: '👑 Rôle Boost équipé', value: '*Aucun*', inline: false });
      }

      // ─── Boosts temp en stock ────────────────────────────
      const tItems = u.inventory.tempBoostItems || [];
      if (tItems.length > 0) {
        embed.addFields({
          name: `⚡ Boosts Temporaires en stock (${tItems.length})`,
          value: tItems.map((b, i) => `\`${i + 1}\` ${b.label}`).join('\n'),
          inline: false,
        });
      } else {
        embed.addFields({ name: '⚡ Boosts Temporaires en stock', value: '*Aucun*', inline: false });
      }

      // ─── Rôle boosts en stock ────────────────────────────
      const rItems = u.inventory.roleBoostItems || [];
      if (rItems.length > 0) {
        embed.addFields({
          name: `👑 Rôle Boosts en stock (${rItems.length})`,
          value: rItems.map((b, i) => `\`${i + 1}\` ${b.label}`).join('\n'),
          inline: false,
        });
      } else {
        embed.addFields({ name: '👑 Rôle Boosts en stock', value: '*Aucun*', inline: false });
      }

      return embed;
    }

    function buildRows() {
      const u      = getUser(interaction.user.id);
      const tItems = u.inventory.tempBoostItems || [];
      const rItems = u.inventory.roleBoostItems || [];
      const rows   = [];

      // Boutons boosts temp
      if (tItems.length > 0) {
        for (let i = 0; i < tItems.length; i += 3) {
          const row = new ActionRowBuilder();
          tItems.slice(i, i + 3).forEach((b, idx) => {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`equip_temp_${i + idx}`)
                .setLabel(`⚡ Équiper : ${b.label}`)
                .setStyle(ButtonStyle.Primary)
            );
          });
          rows.push(row);
        }
      }

      // Boutons rôle boosts
      if (rItems.length > 0) {
        for (let i = 0; i < rItems.length; i += 3) {
          const row = new ActionRowBuilder();
          rItems.slice(i, i + 3).forEach((b, idx) => {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`equip_role_${i + idx}`)
                .setLabel(`👑 Équiper : ${b.label}`)
                .setStyle(ButtonStyle.Success)
            );
          });
          rows.push(row);
        }
      }

      return rows.slice(0, 5); // Discord max 5 rows
    }

    const reply = await interaction.reply({
      embeds:     [buildEmbed()],
      components: buildRows(),
      fetchReply: true,
    });

    const collector = reply.createMessageComponentCollector({ time: 120_000 });

    collector.on('collect', async btn => {
      if (btn.user.id !== interaction.user.id) return btn.reply({ content: '❌', ephemeral: true });

      const u = getUser(btn.user.id);

      if (btn.customId.startsWith('equip_temp_')) {
        const idx   = parseInt(btn.customId.replace('equip_temp_', ''));
        const items = u.inventory.tempBoostItems || [];
        if (!items[idx]) return btn.reply({ content: '❌ Boost introuvable.', ephemeral: true });

        const boost = items[idx];
        // Équiper
        u.inventory.tempBoost = {
          ...boost,
          expiresAt: Date.now() + boost.duration * 60_000,
        };
        // Retirer du stock
        items.splice(idx, 1);
        u.inventory.tempBoostItems = items;
        saveUser(u);

        await btn.reply({ content: `✅ **${boost.label}** équipé pour **${boost.duration} minutes** !`, ephemeral: true });
      }

      else if (btn.customId.startsWith('equip_role_')) {
        const idx   = parseInt(btn.customId.replace('equip_role_', ''));
        const items = u.inventory.roleBoostItems || [];
        if (!items[idx]) return btn.reply({ content: '❌ Boost introuvable.', ephemeral: true });

        const boost  = items[idx];
        const member = await interaction.guild.members.fetch(btn.user.id).catch(() => null);

        // Retirer l'ancien rôle boost si équipé
        if (u.inventory.roleBoost?.roleId && member) {
          const oldRole = interaction.guild.roles.cache.get(u.inventory.roleBoost.roleId);
          if (oldRole) await member.roles.remove(oldRole).catch(() => {});
        }

        // Équiper le nouveau
        u.inventory.roleBoost = { ...boost };
        items.splice(idx, 1);
        u.inventory.roleBoostItems = items;
        saveUser(u);

        // Attribuer le nouveau rôle Discord
        if (boost.roleId && member) {
          const newRole = interaction.guild.roles.cache.get(boost.roleId);
          if (newRole) await member.roles.add(newRole).catch(() => {});
        }

        await btn.reply({ content: `✅ **${boost.label}** équipé de façon permanente !`, ephemeral: true });
      }

      // Mettre à jour l'embed
      await interaction.editReply({
        embeds:     [buildEmbed()],
        components: buildRows(),
      });
    });
  },
};