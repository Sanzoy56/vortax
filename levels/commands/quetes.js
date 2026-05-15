const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getUser, saveUser } = require('../db');
const { generateDailyQuests } = require('../quests');
const { generateQuests } = require('../canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quetes')
    .setDescription('Voir tes quêtes journalières'),

  async execute(interaction) {
    await interaction.deferReply();

    const user = getUser(interaction.user.id);
    generateDailyQuests(user);
    saveUser(user);

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return interaction.editReply('❌ Erreur membre.');

    const buffer     = await generateQuests(member, user.quests.list);
    const attachment = new AttachmentBuilder(buffer, { name: 'quetes.png' });

    await interaction.editReply({ files: [attachment] });
  },
};