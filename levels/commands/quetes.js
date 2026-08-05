const { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUser, saveUser } = require('../db');
const { ensureQuestSlots, chooseQuest } = require('../quests');
const { generateQuests } = require('../canvas');
const { fmt } = require('../levels');

function buildComponents(user) {
  const choiceIndex = user.quests.slots.findIndex(s => s.role === 'choice' && s.status === 'choice');
  if (choiceIndex === -1) return [];

  const slot = user.quests.slots[choiceIndex];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`qc_${choiceIndex}`)
    .setPlaceholder('Choisis ta quête…')
    .addOptions(
      slot.options.map(opt => {
        const rewardParts = [];
        if (opt.rewardExp)   rewardParts.push(`+${fmt(opt.rewardExp)} XP`);
        if (opt.rewardCoins) rewardParts.push(`+${fmt(opt.rewardCoins)} coins`);
        return {
          label: opt.label.slice(0, 100),
          description: `${opt.desc} · ${rewardParts.join(' · ')}`.slice(0, 100),
          value: opt.id,
        };
      })
    );

  return [new ActionRowBuilder().addComponents(menu)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quetes')
    .setDescription('Voir tes quêtes en cours'),

  async execute(interaction) {
    await interaction.deferReply();

    const user = getUser(interaction.user.id);
    ensureQuestSlots(user);
    saveUser(user);

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return interaction.editReply('❌ Erreur membre.');

    const buffer     = await generateQuests(member, user.quests.slots);
    const attachment = new AttachmentBuilder(buffer, { name: 'quetes.png' });
    const components = buildComponents(user);

    const reply = await interaction.editReply({ files: [attachment], components });
    if (components.length === 0) return;

    const collector = reply.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id && i.customId.startsWith('qc_') && i.isStringSelectMenu(),
      time: 15 * 60 * 1000, // 15 min
    });

    collector.on('collect', async i => {
      const slotIndex = parseInt(i.customId.split('_')[1], 10);
      const questId   = i.values[0];

      const freshUser = getUser(interaction.user.id);
      const picked = chooseQuest(freshUser, slotIndex, questId);
      if (!picked) {
        return i.reply({ content: 'Cette quête n\'est plus disponible.', ephemeral: true }).catch(() => {});
      }

      const newBuffer     = await generateQuests(member, freshUser.quests.slots);
      const newAttachment = new AttachmentBuilder(newBuffer, { name: 'quetes.png' });
      const newComponents = buildComponents(freshUser);

      await i.update({ files: [newAttachment], components: newComponents });
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};