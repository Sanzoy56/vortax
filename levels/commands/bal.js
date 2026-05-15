'use strict';
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getUser }      = require('../db');
const { generateBal }  = require('../canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bal')
    .setDescription('Voir le solde d\'un membre')
    .addUserOption(o =>
      o.setName('membre')
       .setDescription('Le membre à inspecter (toi par défaut)')
       .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const cible  = interaction.options.getUser('membre') ?? interaction.user;
    const member = await interaction.guild.members.fetch(cible.id).catch(() => null);

    if (!member) {
      return interaction.editReply({ content: '❌ Membre introuvable sur le serveur.' });
    }

    const userData = getUser(cible.id);
    const buffer   = await generateBal(member, userData);
    const file     = new AttachmentBuilder(buffer, { name: 'bal.png' });

    await interaction.editReply({ files: [file] });
  },
};