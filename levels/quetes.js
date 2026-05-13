const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getUser, saveUser } = require('../db');
const { generateDailyQuests, announceQuests } = require('../quests');
const { canAnnounceQuests } = require('../tasks/questTask');
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

    await interaction.editReply({
      content: '📋 Tes quêtes du jour — les récompenses sont données automatiquement quand tu complètes une quête !',
      files:   [attachment],
    });

    // Annoncer dans le salon quêtes (1 fois/jour max)
    if (canAnnounceQuests(interaction.user.id)) {
      await announceQuests(interaction.guild, interaction.user.id);
    }
  },
};