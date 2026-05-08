'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getDB }               = require('../db');
const { buildTopCanvas }      = require('../canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Classement Top 10 XP'),

  async execute(interaction) {
    await interaction.deferReply();
    const db      = getDB();
    const entries = Object.entries(db)
      .map(([id, u]) => ({ id, niveau: u.niveau ?? 0, xp: u.xp ?? 0 }))
      .sort((a, b) => b.niveau !== a.niveau ? b.niveau - a.niveau : b.xp - a.xp)
      .slice(0, 10);

    const file = await buildTopCanvas(interaction.guild, entries);
    await interaction.editReply({ files: [file] });
  },
};