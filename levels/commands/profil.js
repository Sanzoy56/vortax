const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getUser } = require('../db');
const { levelFromExp } = require('../levels');
const { generateProfile } = require('../canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Affiche ton profil ou celui d\'un membre')
    .addUserOption(o => o.setName('membre').setDescription('Membre à afficher')),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('membre') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.editReply('❌ Membre introuvable.');

    const userData   = getUser(target.id);
    userData.level   = levelFromExp(userData.exp);

    const buffer     = await generateProfile(member, userData);
    const attachment = new AttachmentBuilder(buffer, { name: 'profil.png' });

    await interaction.editReply({ files: [attachment] });
  },
};