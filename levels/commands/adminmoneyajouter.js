'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getUser, saveUser } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminmoneyajouter')
    .setDescription('[ADMIN] Ajouter des VTX-Coins à un membre')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(o => o.setName('membre').setDescription('Le membre ciblé').setRequired(true))
    .addIntegerOption(o => o.setName('somme').setDescription('Quantité de coins à ajouter').setMinValue(1).setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const cible = interaction.options.getUser('membre');
    const somme = interaction.options.getInteger('somme');

    const user = getUser(cible.id);
    user.wallet = (user.wallet || 0) + somme;
    saveUser(user);

    const embed = new EmbedBuilder()
      .setTitle('VTX-Coins ajoutés [ADMIN]')
      .setColor(0xe67e22)
      .setDescription(
        `**+${somme.toLocaleString()} VTX-Coins** ajoutés à <@${cible.id}>\n\n` +
        `Solde actuel : **${user.wallet.toLocaleString()} VTX-Coins**`
      )
      .setFooter({ text: `Action effectuée par ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};