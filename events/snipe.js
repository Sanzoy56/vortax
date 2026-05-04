const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const deletedMessages = new Map();
const editedMessages = new Map();

module.exports = (client) => {

  // ========== STOCKAGE MESSAGES SUPPRIMÉS ==========
  client.on('messageDelete', (message) => {
    if (message.author?.bot) return;
    if (!message.content && message.attachments.size === 0) return;
    deletedMessages.set(message.channel.id, {
      content: message.content || '*(aucun texte)*',
      author: message.author,
      createdAt: message.createdAt,
      attachment: message.attachments.first()?.url ?? null,
    });
  });

  // ========== STOCKAGE MESSAGES MODIFIÉS ==========
  client.on('messageUpdate', (oldMessage, newMessage) => {
    if (oldMessage.author?.bot) return;
    if (!oldMessage.content) return;
    if (oldMessage.content === newMessage.content) return;
    editedMessages.set(oldMessage.channel.id, {
      oldContent: oldMessage.content,
      newContent: newMessage.content,
      author: oldMessage.author,
      createdAt: oldMessage.createdAt,
      url: newMessage.url,
    });
  });

  // ========== COMMANDES PREFIX ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // ========== ?snipe ==========
    if (message.content.toLowerCase() === '?snipe') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('snipe_deleted').setLabel('Messages supprimés').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('snipe_edited').setLabel('Messages modifiés').setEmoji('✏️').setStyle(ButtonStyle.Primary),
      );
      await message.reply({ content: '🔍 Que veux-tu sniper ?', components: [row] });
    }

    // ========== ?snipemember ==========
    if (message.content.toLowerCase() === '?snipemember') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('snipemember_deleted').setLabel('Messages supprimés').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('snipemember_edited').setLabel('Messages modifiés').setEmoji('✏️').setStyle(ButtonStyle.Primary),
      );
      await message.reply({ content: '🔍 Que veux-tu sniper ?', components: [row] });
    }
  });

  // ========== BOUTONS ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // ========== SNIPE SUPPRIMÉ ==========
    if (interaction.customId === 'snipe_deleted') {
      const data = deletedMessages.get(interaction.channel.id);
      if (!data) return interaction.reply({ content: '❌ Aucun message supprimé trouvé dans ce salon.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Dernier message supprimé')
        .setColor(0xff0000)
        .setAuthor({ name: data.author.tag, iconURL: data.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(data.content)
        .setFooter({ text: `Envoyé le ${data.createdAt.toLocaleString('fr-FR')}` });

      if (data.attachment) embed.setImage(data.attachment);
      await interaction.reply({ embeds: [embed] });
    }

    // ========== SNIPE MODIFIÉ ==========
    if (interaction.customId === 'snipe_edited') {
      const data = editedMessages.get(interaction.channel.id);
      if (!data) return interaction.reply({ content: '❌ Aucun message modifié trouvé dans ce salon.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('✏️ Dernier message modifié')
        .setColor(0x5865f2)
        .setAuthor({ name: data.author.tag, iconURL: data.author.displayAvatarURL({ dynamic: true }) })
        .addFields(
          { name: 'Avant', value: data.oldContent },
          { name: 'Après', value: `${data.newContent}\n[Voir le message](${data.url})` }
        )
        .setFooter({ text: `Envoyé le ${data.createdAt.toLocaleString('fr-FR')}` });

      await interaction.reply({ embeds: [embed] });
    }

    // ========== SNIPEMEMBER SUPPRIMÉ ==========
    if (interaction.customId === 'snipemember_deleted') {
      const modal = new ModalBuilder()
        .setCustomId('modal_snipemember_deleted')
        .setTitle('Snipe par membre')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('member_id')
              .setLabel('ID ou mention du membre (@membre ou ID)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    // ========== SNIPEMEMBER MODIFIÉ ==========
    if (interaction.customId === 'snipemember_edited') {
      const modal = new ModalBuilder()
        .setCustomId('modal_snipemember_edited')
        .setTitle('Snipe par membre')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('member_id')
              .setLabel('ID ou mention du membre (@membre ou ID)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }
  });

  // ========== MODALS SNIPEMEMBER ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('modal_snipemember')) return;

    const type = interaction.customId.includes('deleted') ? 'deleted' : 'edited';
    const input = interaction.fields.getTextInputValue('member_id').replace(/[<@!>]/g, '');

    const member = await interaction.guild.members.fetch(input).catch(() => null);
    if (!member) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });

    if (type === 'deleted') {
      const data = deletedMessages.get(interaction.channel.id);
      if (!data || data.author.id !== member.id) {
        return interaction.reply({ content: `❌ Aucun message supprimé de **${member.user.tag}** trouvé dans ce salon.`, ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setTitle('🗑️ Dernier message supprimé')
        .setColor(0xff0000)
        .setAuthor({ name: data.author.tag, iconURL: data.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(data.content)
        .setFooter({ text: `Envoyé le ${data.createdAt.toLocaleString('fr-FR')}` });

      if (data.attachment) embed.setImage(data.attachment);
      await interaction.reply({ embeds: [embed] });
    }

    if (type === 'edited') {
      const data = editedMessages.get(interaction.channel.id);
      if (!data || data.author.id !== member.id) {
        return interaction.reply({ content: `❌ Aucun message modifié de **${member.user.tag}** trouvé dans ce salon.`, ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setTitle('✏️ Dernier message modifié')
        .setColor(0x5865f2)
        .setAuthor({ name: data.author.tag, iconURL: data.author.displayAvatarURL({ dynamic: true }) })
        .addFields(
          { name: 'Avant', value: data.oldContent },
          { name: 'Après', value: `${data.newContent}\n[Voir le message](${data.url})` }
        )
        .setFooter({ text: `Envoyé le ${data.createdAt.toLocaleString('fr-FR')}` });

      await interaction.reply({ embeds: [embed] });
    }
  });
};