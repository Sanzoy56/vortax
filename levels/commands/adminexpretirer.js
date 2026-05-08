'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDB, getUser, saveDB }            = require('../db');
const { withLock: withUserLock }            = require('../db');
const { xpPourNiveau, gererNiveauEtRang }   = require('../xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminexpretirer')
    .setDescription('[ADMIN] Retirer de l\'XP à un membre')
    .setDefaultMemberPermissions(0)
    .addUserOption(o => o.setName('membre').setDescription('Le membre ciblé').setRequired(true))
    .addIntegerOption(o => o.setName('somme').setDescription('Quantité d\'XP à retirer').setMinValue(1).setRequired(true)),

  async execute(interaction) {
    const cible = interaction.options.getUser('membre');
    const somme = interaction.options.getInteger('somme');

    await withUserLock(cible.id, async () => {
      const db         = getDB();
      const user       = getUser(db, cible.id);
      const ancienNiveau = user.niveau;
      user.xp = Math.max(0, (user.xp || 0) - somme);

      const membre = await interaction.guild.members.fetch(cible.id).catch(() => null);
      await gererNiveauEtRang(user, ancienNiveau, interaction.guild, membre, cible.id);
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('XP retirée [ADMIN]')
        .setColor(0xe74c3c)
        .setDescription(
          `**-${somme.toLocaleString()} XP** retirés à <@${cible.id}>\n\n` +
          `Niveau : **${user.niveau}**\n` +
          `XP actuelle : **${user.xp}** / **${xpPourNiveau(user.niveau)}**`
        )
        .setFooter({ text: `Action effectuée par ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    });
  },
};