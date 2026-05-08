'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getDB, getUser, withLock, saveDB } = require('../db');
const { buildProfilCanvas }               = require('../canvas');
const { avancerQuete }                    = require('../quetes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Affiche ton profil ou celui d\'un membre')
    .addUserOption(o => o.setName('membre').setDescription('Membre à voir').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('membre') ?? interaction.user;

    await withLock(target.id, async () => {
      const db   = getDB();
      const user = getUser(db, target.id);
      const now  = Date.now();

      if (target.id === interaction.user.id) {
        avancerQuete(user, 'spe_profil', 1, interaction.guild, interaction.user.id);
        saveDB(db);
      }

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      const file   = await buildProfilCanvas(target, member, user, now);

      await interaction.reply({ files: [file] });
    });
  },
};