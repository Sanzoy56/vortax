'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDB, getUser, saveDB }            = require('../db');
const { withLock: withUserLock }            = require('../db');
const { xpPourNiveau, gererNiveauEtRang }   = require('../xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminexpajouter')
    .setDescription('[ADMIN] Ajouter de l\'XP à un membre')
    .setDefaultMemberPermissions(0)
    .addUserOption(o => o.setName('membre').setDescription('Le membre ciblé').setRequired(true))
    .addIntegerOption(o => o.setName('somme').setDescription('Quantité d\'XP à ajouter').setMinValue(1).setRequired(true)),

  async execute(interaction) {
    const cible = interaction.options.getUser('membre');
    const somme = interaction.options.getInteger('somme');

    await withUserLock(cible.id, async () => {
      const db         = getDB();
      const user       = getUser(db, cible.id);
      const ancienNiveau = user.niveau;
      user.xp += somme;

      const membre = await interaction.guild.members.fetch(cible.id).catch(() => null);
      await gererNiveauEtRang(user, ancienNiveau, interaction.guild, membre, cible.id);
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('XP ajoutée [ADMIN]')
        .setColor(0xe67e22)
        .setDescription(
          `**+${somme.toLocaleString()} XP** ajoutés à <@${cible.id}>\n\n` +
          `Niveau : **${user.niveau}**\n` +
          `XP actuelle : **${user.xp}** / **${xpPourNiveau(user.niveau)}**`
        )
        .setFooter({ text: `Action effectuée par ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    });
  },
};