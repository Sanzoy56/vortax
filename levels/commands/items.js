'use strict';
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDB, getUser, withLock, saveDB } = require('../db');
const { ITEMS } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('items')
    .setDescription('Boutique des items spéciaux'),

  async execute(interaction) {
    const db   = getDB();
    const user = getUser(db, interaction.user.id);
    const now  = Date.now();

    const buttons = ITEMS.map(item =>
      new ButtonBuilder()
        .setCustomId(`boutique_item_${item.id}`)
        .setLabel(`${item.nom} — ${(item.prix / 1000).toFixed(0)}k`)
        .setStyle(ButtonStyle.Success)
    );
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5)
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

    const shieldInfo = user.shieldActif && user.shieldActif > now
      ? `Bouclier actif — expire <t:${Math.floor(user.shieldActif / 1000)}:R>`
      : 'Aucun bouclier actif';
    const lameInfo = user.lameProchaineRob
      ? 'Lame Acérée — active au prochain rob'
      : 'Lame Acérée — inactive';

    const embed = new EmbedBuilder()
      .setTitle('Boutique Items VTX')
      .setColor(0x2ecc71)
      .setDescription(`Ton solde : **${user.coins.toLocaleString()} VTX-Coins**\n\n${shieldInfo}\n${lameInfo}\n\n> Tu peux aussi acheter des boosts XP avec **/boutique**`)
      .addFields({
        name: 'Items disponibles',
        value: ITEMS.map(i => `**${i.nom}** — ${i.prix.toLocaleString()} VTX-Coins\n*${i.desc}*`).join('\n\n'),
      })
      .setFooter({ text: 'Team Vortax 2024 - 2026', iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
  },

  async handleButton(interaction) {
    const itemId = interaction.customId.replace('boutique_item_', '');

    await withLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);
      const now  = Date.now();
      const item = ITEMS.find(i => i.id === itemId);

      if (!item)
        return interaction.reply({ content: 'Item introuvable.', ephemeral: true });
      if (user.coins < item.prix)
        return interaction.reply({ content: `Il te faut **${item.prix.toLocaleString()} coins**. Tu en as **${user.coins.toLocaleString()}**.`, ephemeral: true });

      user.coins -= item.prix;

      if (item.id === 'item_shield') {
        const base       = user.shieldActif && user.shieldActif > now ? user.shieldActif : now;
        user.shieldActif = base + item.duree;
        saveDB(db);
        return interaction.reply({ content: `**Bouclier Anti-Rob** activé jusqu'à <t:${Math.floor(user.shieldActif / 1000)}:R>.`, ephemeral: true });
      }
      if (item.id === 'item_purge') {
        if (!user.malusActif || user.malusActif.expireAt <= now) {
          user.coins += item.prix;
          saveDB(db);
          return interaction.reply({ content: 'Tu n\'as aucun malus actif ! Tu n\'as pas été débité.', ephemeral: true });
        }
        user.malusActif = null;
        saveDB(db);
        return interaction.reply({ content: 'Malus supprimé grâce à la **Purge Malus** !', ephemeral: true });
      }
      if (item.id === 'item_vol2x') {
        user.lameProchaineRob = true;
        saveDB(db);
        return interaction.reply({ content: '**Lame Acérée** activée ! Ton prochain `/rob` volera le double.', ephemeral: true });
      }

      saveDB(db);
      return interaction.reply({ content: `**${item.nom}** acheté !`, ephemeral: true });
    });
  },
};