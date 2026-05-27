'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getUser }       = require('../db');
const { addExpAdmin, expForLevel, levelFromExp } = require('../levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminexpajouter')
    .setDescription('[ADMIN] Ajouter de l\'XP à un membre')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(o => o.setName('membre').setDescription('Le membre ciblé').setRequired(true))
    .addIntegerOption(o => o.setName('somme').setDescription('Quantité d\'XP à ajouter').setMinValue(1).setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const cible  = interaction.options.getUser('membre');
    const somme  = interaction.options.getInteger('somme');
    const member = await interaction.guild.members.fetch(cible.id).catch(() => null);

    if (!member) {
      return interaction.editReply({ content: 'Membre introuvable sur le serveur.' });
    }

    const { oldLevel, newLevel, exp } = await addExpAdmin(member, somme);
    const neededForNext = expForLevel(newLevel);

    const embed = new EmbedBuilder()
      .setTitle('XP ajoutée [ADMIN]')
      .setColor(0xe67e22)
      .setDescription(
        `**+${somme.toLocaleString()} XP** ajoutés à <@${cible.id}>\n\n` +
        `Niveau : **${newLevel}**${newLevel !== oldLevel ? ` *(était ${oldLevel})*` : ''}\n` +
        `XP actuelle : **${exp}** / **${neededForNext}**`
      )
      .setFooter({ text: `Action effectuée par ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};