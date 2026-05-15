'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getUser, saveUser } = require('../db');
const { xpPourNiveau }      = require('../xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminexpretirer')
    .setDescription('[ADMIN] Retirer de l\'XP à un membre')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(o => o.setName('membre').setDescription('Le membre ciblé').setRequired(true))
    .addIntegerOption(o => o.setName('somme').setDescription('Quantité d\'XP à retirer').setMinValue(1).setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const cible = interaction.options.getUser('membre');
    const somme = interaction.options.getInteger('somme');

    const user = getUser(cible.id);
    user.exp = Math.max(0, (user.exp || 0) - somme);

    // Descente de niveau
    while (user.level > 0 && user.exp < 0) {
      user.level -= 1;
      user.exp   += xpPourNiveau(user.level);
    }
    if (user.exp < 0) user.exp = 0;

    saveUser(user);

    const embed = new EmbedBuilder()
      .setTitle('XP retirée [ADMIN]')
      .setColor(0xe74c3c)
      .setDescription(
        `**-${somme.toLocaleString()} XP** retirés à <@${cible.id}>\n\n` +
        `Niveau : **${user.level}**\n` +
        `XP actuelle : **${user.exp}** / **${xpPourNiveau(user.level)}**`
      )
      .setFooter({ text: `Action effectuée par ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};