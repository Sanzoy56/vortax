const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, saveUser } = require('../db');
const { TEMP_BOOSTS, ROLE_BOOSTS } = require('../config');
const { fmt } = require('../levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Accéder à la boutique')
    .addSubcommand(sub =>
      sub.setName('boost')
         .setDescription('Boosts temporaires d\'EXP / Coins (max 1h)')
    )
    .addSubcommand(sub =>
      sub.setName('role')
         .setDescription('Boosts permanents via rôle (min 1M VTX-Coins)')
    ),

  async execute(interaction) {
    const sub  = interaction.options.getSubcommand();
    const user = getUser(interaction.user.id);

    if (sub === 'boost') {
      const embed = new EmbedBuilder()
        .setTitle('⚡ Boutique — Boosts Temporaires')
        .setColor(0x7c5cfc)
        .setDescription(`💼 Ton portefeuille : **${fmt(user.wallet)} VTX-Coins**\n\n*L'argent doit être sur toi (pas en banque) pour acheter.*`)
        .setFooter({ text: 'Un seul boost temporaire équipé à la fois.' });

      TEMP_BOOSTS.forEach(b => {
        const boostLine = b.expBoost
          ? `+${b.expBoost * 100}% EXP`
          : `+${b.coinBoost * 100}% Coins`;
        embed.addFields({ name: b.label, value: `${boostLine} — **${fmt(b.price)} VTX-Coins**`, inline: true });
      });

      const rows = [];
      for (let i = 0; i < TEMP_BOOSTS.length; i += 3) {
        const row = new ActionRowBuilder();
        TEMP_BOOSTS.slice(i, i + 3).forEach(b => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`buy_temp_${b.id}`)
              .setLabel(b.label)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(user.wallet < b.price)
          );
        });
        rows.push(row);
      }

      const reply = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
      const collector = reply.createMessageComponentCollector({ time: 60_000 });

      collector.on('collect', async btn => {
        if (btn.user.id !== interaction.user.id) return btn.reply({ content: '❌', ephemeral: true });
        const boostId = btn.customId.replace('buy_temp_', '');
        const boost   = TEMP_BOOSTS.find(b => b.id === boostId);
        if (!boost) return btn.reply({ content: '❌ Boost introuvable.', ephemeral: true });

        const u = getUser(btn.user.id);
        if (u.wallet < boost.price) return btn.reply({ content: '❌ Pas assez de VTX-Coins sur toi.', ephemeral: true });

        u.wallet -= boost.price;
        // Ajouter à l'inventaire (pas équipé automatiquement)
        if (!u.inventory.tempBoostItems) u.inventory.tempBoostItems = [];
        u.inventory.tempBoostItems.push({
          ...boost,
          purchasedAt: Date.now(),
          equipped:    false,
        });
        saveUser(u);

        await btn.reply({ content: `✅ **${boost.label}** acheté et ajouté à ton inventaire !`, ephemeral: true });
      });

    } else if (sub === 'role') {
      const embed = new EmbedBuilder()
        .setTitle('👑 Boutique — Boosts Permanents')
        .setColor(0xf5c842)
        .setDescription(`💼 Ton portefeuille : **${fmt(user.wallet)} VTX-Coins**\n\n*Boosts permanents appliqués via rôle. Un seul rôle boost à la fois.*`)
        .setFooter({ text: 'Minimum 1 000 000 VTX-Coins requis.' });

      ROLE_BOOSTS.forEach(b => {
        const boostLine = b.expBoost
          ? `+${b.expBoost * 100}% EXP permanent`
          : `+${b.coinBoost * 100}% Coins permanent`;
        embed.addFields({ name: b.label, value: `${boostLine} — **${fmt(b.price)} VTX-Coins**`, inline: true });
      });

      const rows = [];
      for (let i = 0; i < ROLE_BOOSTS.length; i += 3) {
        const row = new ActionRowBuilder();
        ROLE_BOOSTS.slice(i, i + 3).forEach(b => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`buy_role_${b.id}`)
              .setLabel(b.label)
              .setStyle(ButtonStyle.Success)
              .setDisabled(user.wallet < b.price)
          );
        });
        rows.push(row);
      }

      const reply = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
      const collector = reply.createMessageComponentCollector({ time: 60_000 });

      collector.on('collect', async btn => {
        if (btn.user.id !== interaction.user.id) return btn.reply({ content: '❌', ephemeral: true });
        const boostId = btn.customId.replace('buy_role_', '');
        const boost   = ROLE_BOOSTS.find(b => b.id === boostId);
        if (!boost) return btn.reply({ content: '❌ Boost introuvable.', ephemeral: true });

        const u = getUser(btn.user.id);
        if (u.wallet < boost.price) return btn.reply({ content: '❌ Pas assez de VTX-Coins sur toi.', ephemeral: true });

        u.wallet -= boost.price;
        if (!u.inventory.roleBoostItems) u.inventory.roleBoostItems = [];
        u.inventory.roleBoostItems.push({
          ...boost,
          purchasedAt: Date.now(),
          equipped:    false,
        });
        saveUser(u);

        // Attribuer le rôle Discord si défini
        if (boost.roleId) {
          const member = await interaction.guild.members.fetch(btn.user.id).catch(() => null);
          if (member) {
            const role = interaction.guild.roles.cache.get(boost.roleId);
            if (role) await member.roles.add(role).catch(() => {});
          }
        }

        await btn.reply({ content: `✅ **${boost.label}** acheté et ajouté à ton inventaire !`, ephemeral: true });
      });
    }
  },
};