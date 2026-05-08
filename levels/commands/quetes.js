'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getDB, getUser, withLock, saveDB } = require('../db');
const { buildQuetesCanvas }               = require('../canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quetes')
    .setDescription('Tes quêtes du jour'),

  async execute(interaction) {
    await withLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);
      saveDB(db);

      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      const file   = await buildQuetesCanvas(user, interaction.user, member);

      await interaction.reply({ files: [file] });
    });
  },
};