'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { addExpAdmin, expForLevel, levelFromExp } = require('../levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminexpretirer')
    .setDescription('[ADMIN] Retirer de l\'XP à un membre')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(o => o.setName('membre').setDescription('Le membre ciblé').setRequired(true))
    .addIntegerOption(o => o.setName('somme').setDescription('Quantité d\'XP à retirer').setMinValue(1).setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const cible  = interaction.options.getUser('membre');
    const somme  = interaction.options.getInteger('somme');
    const member = await interaction.guild.members.fetch(cible.id).catch(() => null);

    if (!member) {
      return interaction.editReply({ content: 'Membre introuvable sur le serveur.' });
    }

    const { oldLevel, newLevel, exp } = await addExpAdmin(member, -somme);
    const neededForNext = expForLevel(newLevel);

    const embed = new EmbedBuilder()
      .setTitle('XP retirée [ADMIN]')
      .setColor(0xe74c3c)
      .setDescription(
        `**-${somme.toLocaleString()} XP** retirés à <@${cible.id}>\n\n` +
        `Niveau : **${newLevel}**${newLevel !== oldLevel ? ` *(était ${oldLevel})*` : ''}\n` +
        `XP actuelle : **${exp}** / **${neededForNext}**`
      )
      .setFooter({ text: `Action effectuée par ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
