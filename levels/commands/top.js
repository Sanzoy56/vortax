const { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getAllUsers } = require('../db');
const { levelFromExp } = require('../levels');
const { generateLeaderboard } = require('../canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Classement des membres')
    .addStringOption(o =>
      o.setName('mode')
       .setDescription('Classer par EXP ou VTX-Coins')
       .addChoices(
         { name: '🏆 EXP',        value: 'exp'   },
         { name: '💰 VTX-Coins',  value: 'coins' }
       )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const mode     = interaction.options.getString('mode') || 'exp';
    const allUsers = getAllUsers();

    // Construire les entrées avec nom Discord
    const entries = [];
    for (const [id, u] of Object.entries(allUsers)) {
      const member = await interaction.guild.members.fetch(id).catch(() => null);
      if (!member) continue;
      entries.push({
        id,
        username:  member.displayName,
        avatarURL: member.user.displayAvatarURL({ format: 'png' }),
        exp:       u.exp    || 0,
        level:     levelFromExp(u.exp || 0),
        coins:     (u.wallet || 0) + (u.bank || 0),
      });
    }

    // Trier
    entries.sort((a, b) => mode === 'exp' ? b.exp - a.exp : b.coins - a.coins);
    const top10 = entries.slice(0, 10);

    const buffer     = await generateLeaderboard(top10, mode);
    const attachment = new AttachmentBuilder(buffer, { name: 'top.png' });

    // Boutons pour switcher
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('top_exp').setLabel('🏆 EXP').setStyle(mode === 'exp' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('top_coins').setLabel('💰 VTX-Coins').setStyle(mode === 'coins' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );

    const reply = await interaction.editReply({ files: [attachment], components: [row] });

    const collector = reply.createMessageComponentCollector({ time: 120_000 });
    collector.on('collect', async btn => {
      if (btn.user.id !== interaction.user.id) return btn.reply({ content: '❌', ephemeral: true });
      await btn.deferUpdate();
      const newMode  = btn.customId === 'top_exp' ? 'exp' : 'coins';
      entries.sort((a, b) => newMode === 'exp' ? b.exp - a.exp : b.coins - a.coins);
      const newBuf   = await generateLeaderboard(entries.slice(0, 10), newMode);
      const newAtt   = new AttachmentBuilder(newBuf, { name: 'top.png' });
      const newRow   = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('top_exp').setLabel('🏆 EXP').setStyle(newMode === 'exp' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('top_coins').setLabel('💰 VTX-Coins').setStyle(newMode === 'coins' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      );
      await interaction.editReply({ files: [newAtt], components: [newRow] });
    });
  },
};