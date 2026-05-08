'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getDB }               = require('../db');
const { buildTopMoneyCanvas } = require('../canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('topmoney')
    .setDescription('Classement Top 10 Coins'),

  async execute(interaction) {
    await interaction.deferReply();
    const db      = getDB();
    const entries = Object.entries(db)
      .map(([id, u]) => ({ id, coins: u.coins ?? 0, niveau: u.niveau ?? 0 }))
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 10);

    const file = await buildTopMoneyCanvas(interaction.guild, entries);
    await interaction.editReply({ files: [file] });
  },
};