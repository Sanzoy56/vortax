'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDB, getUser, saveDB }            = require('../db');
const { withLock: withUserLock }            = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminmoneyajouter')
    .setDescription('[ADMIN] Ajouter des VTX-Coins à un membre')
    .setDefaultMemberPermissions(0)
    .addUserOption(o => o.setName('membre').setDescription('Le membre ciblé').setRequired(true))
    .addIntegerOption(o => o.setName('somme').setDescription('Quantité de coins à ajouter').setMinValue(1).setRequired(true)),

  async execute(interaction) {
    const cible = interaction.options.getUser('membre');
    const somme = interaction.options.getInteger('somme');

    await withUserLock(cible.id, async () => {
      const db   = getDB();
      const user = getUser(db, cible.id);
      user.coins += somme;
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('VTX-Coins ajoutés [ADMIN]')
        .setColor(0xe67e22)
        .setDescription(
          `**+${somme.toLocaleString()} VTX-Coins** ajoutés à <@${cible.id}>\n\n` +
          `Solde actuel : **${user.coins.toLocaleString()} VTX-Coins**`
        )
        .setFooter({ text: `Action effectuée par ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    });
  },
};