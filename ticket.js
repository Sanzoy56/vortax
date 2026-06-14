const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('./config.json');
const token = require('./token.json');

const { getConfig } = require('./config')
const { sendLogCard } = require('./levels/logCard')
const discordTranscripts = require('discord-html-transcripts');

// ========== HISTORIQUE IA ==========
const ticketHistories = new Map();

// ========== PUSH DASHBOARD ==========
const DASH_URL    = 'https://vtx-bot.alwaysdata.net';
const PUSH_SECRET = 'vtx-stats-secret-2024';
async function pushTicket(data) {
  try {
    await fetch(`${DASH_URL}/api/tickets/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-stats-secret': PUSH_SECRET },
      body: JSON.stringify(data),
    });
  } catch {}
}

// ========== GROK IA ==========
const askGrok = async (history, ticketType) => {
  const typeContext = ticketType === 'recrutement'
    ? 'Il s\'agit d\'un ticket de candidature staff. Aide le membre à préparer sa candidature.'
    : 'Il s\'agit d\'un ticket de question ou signalement. Aide le membre à résoudre son problème.';

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.apiGrok}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant support du serveur Discord "Team Vortax". ${typeContext} Réponds en français. Si tu ne peux pas aider, termine par [NEED_STAFF].`,
          },
          ...history,
        ],
      }),
    });

    const data = await response.json();

    if (data.error) throw new Error(`Grok API: ${data.error.message}`);
    if (!data.choices?.[0]?.message?.content) throw new Error('Réponse Grok invalide');

    const text = data.choices[0].message.content;
    const needsStaff = text.includes('[NEED_STAFF]');
    const answer = text.replace('[NEED_STAFF]', '').trim();
    return { answer, needsStaff };

  } catch (err) {
    console.error('[Grok ERREUR]', err);
    throw err;
  }
};

// ========== HELPER LOG ACTION TICKET ==========
const logTicket = async (guild, title, accent, rows, longText) => {
  const cfg   = await getConfig();
  const salon = guild.channels.cache.get(cfg.log_tickets);
  if (!salon) return;
  await sendLogCard(salon, { title, accent, rows, longText, footerExtra: 'Tickets' }).catch(console.error);
};

module.exports = (client) => {

  // ========== COMMANDES TEXTE ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.member) return;

    const msgChannel = message.channel;
    let staffRoleId = '1497331100782039071';
    let _catId      = '1416145060285648966';
    try {
      const _fs2 = require('fs'), _p2 = require('path');
      const _c2 = JSON.parse(_fs2.readFileSync(_p2.join(__dirname, 'config.json'), 'utf8'));
      if (_c2.ticket_staff_role) staffRoleId = _c2.ticket_staff_role;
      if (_c2.ticket_category)   _catId      = _c2.ticket_category;
    } catch {}

    // ----- Panneau ticket -----
    if (message.content.trim() === '!ticket') {
      const embed = new EmbedBuilder()
        .setTitle('Team Vortax - Support')
        .setDescription(`__Contacter le Support de Team Vortax__
                
Il y a 3 catégories de tickets mis à votre disposition :

<:pointblue:1502098251489218653> **Gestion Staff** : Pour rejoindre notre équipe de modération.

<:8367pointpurple:1510070003700076605> **Question / Signalement** : Pour poser une question ou signaler un membre.

<:5956pointred:1510069985462980678> **Assistance IA** : Obtenez une réponse instantanée de notre assistant IA. Le staff sera alerté si nécessaire.

<:warning:1510075448632021204> Les tickets troll sont interdits et très fortement sanctionnés.`)
        .setColor(0x2B2D31)
        .setFooter({ text: '— Support Team Vortax' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_staff')
            .setLabel('Gestion Staff')
            .setEmoji('🛡️')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('ticket_question')
            .setLabel('Question / Signalement')
            .setEmoji('❓')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('ticket_ia')
            .setLabel('Assistance IA')
            .setEmoji('🤖')
            .setStyle(ButtonStyle.Primary),
        );

      await msgChannel.send({ embeds: [embed], components: [row] });
      return;
    }

    // ----- Supprimer ticket (transcript + delete) -----
    if (message.content.trim() === '-delete') {
      const isTicket = msgChannel.name.startsWith('question-') || msgChannel.name.startsWith('recrutement-') || msgChannel.name.startsWith('ia-');
      if (!isTicket) return message.reply('❌ Cette commande ne peut être utilisée que dans un ticket.');

      const isStaff = message.member.roles.cache.has(staffRoleId);
      if (!isStaff) {
        return message.reply({ content: '❌ Tu ne peux pas supprimer ce ticket. Seul le staff est autorisé.', fetchReply: true })
          .then(reply => {
            setTimeout(() => { reply.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
          });
      }

      await message.reply({ content: '📄 Génération du transcript en cours...' });
      ticketHistories.delete(msgChannel.id);

      try {
        const cfg        = await getConfig();
        const fichier    = await discordTranscripts.createTranscript(msgChannel, {
          limit: -1,
          filename: `transcript-${msgChannel.name}.html`,
          saveImages: true,
          poweredBy: false,
          footerText: 'Transcript généré par Team Vortax — {number} message{s}',
        });

        // Hébergé sur le panel pour éviter l'aperçu moche que Discord affiche
        // automatiquement pour les fichiers .html attachés, et permettre
        // d'ouvrir le transcript directement dans le navigateur.
        let transcriptUrl = null;
        try {
          const res = await fetch(`${DASH_URL}/api/transcripts`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/html', 'X-Stats-Secret': PUSH_SECRET },
            body: fichier.attachment,
          });
          if (res.ok) transcriptUrl = (await res.json()).url ?? null;
        } catch (e) {
          console.error('[Transcript] Erreur upload :', e.message);
        }

        const logsChannel = msgChannel.guild.channels.cache.get(cfg.log_transcripts);
        if (logsChannel) {
          const components = transcriptUrl ? [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Voir le transcript').setStyle(ButtonStyle.Link).setURL(transcriptUrl)
          )] : [];

          await sendLogCard(logsChannel, {
            title: 'Transcript de ticket',
            accent: '#5865f2',
            rows: [
              { label: 'Ticket', value: msgChannel.name },
              { label: 'Supprimé par', value: `${message.member.user.tag}` },
              { label: 'Date', value: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) },
            ],
            components,
          }).catch(() => {});
        }
      } catch (err) {
        console.error('[Transcript] Erreur :', err);
      }

      await logTicket(message.guild, 'Ticket supprimé', '#ef4444', [
        { label: 'Ticket', value: msgChannel.name },
        { label: 'Supprimé par', value: `${message.member.user.tag}` },
      ]);
      pushTicket({ event: 'close', channelId: msgChannel.id, channelName: msgChannel.name, closedById: message.author.id, closedByName: message.author.username });

      const deleteEmbed = new EmbedBuilder()
        .setTitle('🗑️ Suppression du ticket')
        .setDescription('Transcript sauvegardé. Ce salon sera supprimé dans **5 secondes**...')
        .setColor(0xFF0000);
      await msgChannel.send({ embeds: [deleteEmbed] });
      setTimeout(async () => { await msgChannel.delete().catch(console.error); }, 5000);
      return;
    }

    // ========== IA — Réponse automatique dans les tickets IA ==========
    if (!msgChannel.name.startsWith('ia-')) return;
    if (message.content.trim().startsWith('-')) return;

    let state = ticketHistories.get(msgChannel.id);
    if (!state) {
      state = { messages: [], iaActive: true };
      ticketHistories.set(msgChannel.id, state);
    }

    if (!state.iaActive) return;

    const isStaffMember = message.member.roles.cache.has(staffRoleId);
    const isTicketOwner = message.author.id === state.ownerId;

    if (isStaffMember && !isTicketOwner) return;

    state.messages.push({ role: 'user', content: message.content });
    ticketHistories.set(msgChannel.id, state);

    try {
      await msgChannel.sendTyping();
      const { answer, needsStaff } = await askGrok(state.messages, 'ia');
      state.messages.push({ role: 'assistant', content: answer });
      ticketHistories.set(msgChannel.id, state);

      if (needsStaff) {
        state.iaActive = false;
        ticketHistories.set(msgChannel.id, state);
        const staffEmbed = new EmbedBuilder()
          .setDescription(`${answer}\n\n> ⚠️ Je ne suis pas en mesure de résoudre ce problème seul. Le staff a été notifié et va prendre le relais !`)
          .setColor(0xFFA500)
          .setFooter({ text: '🤖 Assistance IA — Team Vortax' });
        await msgChannel.send({ content: `<@&${staffRoleId}>`, embeds: [staffEmbed] });
      } else {
        const iaEmbed = new EmbedBuilder()
          .setDescription(answer)
          .setColor(0x5865f2)
          .setFooter({ text: '🤖 Assistance IA — Team Vortax' });
        await msgChannel.send({ embeds: [iaEmbed] });
      }
    } catch (err) {
      console.error('[IA Ticket] Erreur Grok :', err);
      await msgChannel.send({ content: `⚠️ Une erreur est survenue avec l'IA. <@&${staffRoleId}> merci d'intervenir.` });
    }
  });

  // ========== INTERACTIONS (boutons + modals) ==========
  client.on('interactionCreate', async (interaction) => {

    // ========== BOUTONS ==========
    if (interaction.isButton()) {
      const { customId, member, guild } = interaction;

      if (customId === 'ticket_staff' || customId === 'ticket_question') {
        const modal = new ModalBuilder()
          .setCustomId(`modal_${customId}`)
          .setTitle(customId === 'ticket_staff' ? 'Gestion Staff' : 'Question / Signalement');
        const raisonInput = new TextInputBuilder()
          .setCustomId('raison')
          .setLabel('Quelle est la raison de votre ticket ?')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Décrivez votre demande ici...')
          .setRequired(true)
          .setMaxLength(500);
        modal.addComponents(new ActionRowBuilder().addComponents(raisonInput));
        await interaction.showModal(modal);
        return;
      }

      if (customId === 'ticket_ia') {
        const existing = guild.channels.cache.find(c => c.name === `ia-${member.user.username}`);
        if (existing) {
          return interaction.reply({ content: `❌ Tu as déjà un ticket IA ouvert : ${existing}`, flags: 64 });
        }
        const modal = new ModalBuilder()
          .setCustomId('modal_ticket_ia')
          .setTitle('Assistance IA');
        const raisonInput = new TextInputBuilder()
          .setCustomId('raison')
          .setLabel('Quelle est votre question ?')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Posez votre question, l\'IA vous répondra immédiatement...')
          .setRequired(true)
          .setMaxLength(500);
        modal.addComponents(new ActionRowBuilder().addComponents(raisonInput));
        await interaction.showModal(modal);
        return;
      }
    }

    // ========== MODALS ==========
    if (interaction.isModalSubmit()) {
      const { customId, member, guild } = interaction;

      // deferReply immédiat pour les modals ticket (avant toute opération async)
      if (customId === 'modal_ticket_staff' || customId === 'modal_ticket_question' || customId === 'modal_ticket_ia') {
        try { await interaction.deferReply({ flags: 64 }); } catch { return; }
      }

      // Config tickets — valeurs hardcodées en fallback
      let staffRoleId = '1497331100782039071';
      let categorieId = '1416145060285648966';
      try {
        const _fs = require('fs'), _path = require('path');
        const _cfg = JSON.parse(_fs.readFileSync(_path.join(__dirname, 'config.json'), 'utf8'));
        if (_cfg.ticket_staff_role) staffRoleId = _cfg.ticket_staff_role;
        if (_cfg.ticket_category)   categorieId = _cfg.ticket_category;
      } catch {}

      // ----- Tickets Staff / Question -----
      if (customId === 'modal_ticket_staff' || customId === 'modal_ticket_question') {
        if (!staffRoleId || !categorieId) {
          return interaction.editReply({ content: '❌ Configuration incomplète (ticket_staff_role ou ticket_category manquant dans le dashboard).' });
        }

        const raison     = interaction.fields.getTextInputValue('raison');
        const isStaff    = customId === 'modal_ticket_staff';
        const nomSalon   = isStaff ? `recrutement-${member.user.username}` : `question-${member.user.username}`;
        const typeTicket = isStaff ? '🛡️ Gestion Staff' : '❓ Question / Signalement';

        try {
          const salon = await guild.channels.create({
            name: nomSalon,
            parent: categorieId,
            permissionOverwrites: [
              { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
              { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
              { id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
          });

          const now       = new Date();
          const dateHeure = now.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
          const ticketEmbed = new EmbedBuilder()
            .setTitle(typeTicket)
            .setDescription(`Salut ${member} ! Un <@&${staffRoleId}> va te répondre dans les minutes qui suivent !\nUtilise \`-delete\` pour supprimer le ticket (un transcript sera sauvegardé automatiquement).\n\n**Raison**\n\`\`\`${raison}\`\`\``)
            .setColor(0x2B2D31)
            .setFooter({ text: `Team Vortax - Support • ${dateHeure}` });

          await salon.send({ content: `${member} <@&${staffRoleId}>`, embeds: [ticketEmbed] });
          await interaction.editReply({ content: `✅ Ton ticket a été créé : ${salon}` });

          await logTicket(guild, 'Ticket ouvert', '#22c55e', [
            { label: 'Ticket', value: nomSalon },
            { label: 'Ouvert par', value: `${member.user.tag}` },
            { label: 'Type', value: typeTicket.replace(/^\S+\s/, '') },
          ], { label: 'Raison', value: raison });
          pushTicket({ event: 'open', channelId: salon.id, channelName: nomSalon, creatorId: member.id, creatorName: member.user.username, type: typeTicket, reason: raison });
        } catch(e) {
          console.error('[Ticket] Erreur création :', e.message);
          interaction.editReply({ content: `❌ Erreur lors de la création du ticket : ${e.message}` }).catch(() => {});
        }
      }

      // ----- Ticket IA -----
     if (customId === 'modal_ticket_ia') {
        const raison   = interaction.fields.getTextInputValue('raison');
        const nomSalon = `ia-${member.user.username}`;

        const salon = await guild.channels.create({
          name: nomSalon,
          parent: categorieId,
          permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ],
        });

        const now       = new Date();
        const dateHeure = now.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

        const accueilEmbed = new EmbedBuilder()
          .setTitle('🤖 Assistance IA — Team Vortax')
          .setDescription(`Salut ${member} ! Je suis l'assistant IA de **Team Vortax**.\n\nJe vais faire de mon mieux pour répondre à ta question. Si je ne suis pas en mesure de t'aider, je contacterai automatiquement le staff.\n\n**Ta question :**\n\`\`\`${raison}\`\`\`\n> 💬 Réponds directement ici, je t'écoute !`)
          .setColor(0x5865f2)
          .setFooter({ text: `Team Vortax - Assistance IA • ${dateHeure}` });

        await salon.send({ content: `${member}`, embeds: [accueilEmbed] });
        await interaction.editReply({ content: `✅ Ton ticket IA a été créé : ${salon}` });

        ticketHistories.set(salon.id, {
          messages: [{ role: 'user', content: raison }],
          iaActive: true,
          ownerId: member.id,
        });

        try {
          await salon.sendTyping();
          const { answer, needsStaff } = await askGrok([{ role: 'user', content: raison }], 'ia');

          const state = ticketHistories.get(salon.id);
          state.messages.push({ role: 'assistant', content: answer });
          ticketHistories.set(salon.id, state);

          if (needsStaff) {
            state.iaActive = false;
            ticketHistories.set(salon.id, state);
            const staffEmbed = new EmbedBuilder()
              .setDescription(`${answer}\n\n> ⚠️ Cette question nécessite l'intervention du staff. Ils ont été notifiés !`)
              .setColor(0xFFA500)
              .setFooter({ text: '🤖 Assistance IA — Team Vortax' });
            await salon.send({ content: `<@&${staffRoleId}>`, embeds: [staffEmbed] });
          } else {
            const iaEmbed = new EmbedBuilder()
              .setDescription(answer)
              .setColor(0x5865f2)
              .setFooter({ text: '🤖 Assistance IA — Team Vortax' });
            await salon.send({ embeds: [iaEmbed] });
          }
        } catch (err) {
          console.error('[IA Ticket] Erreur Grok :', err);
          await salon.send({ content: `⚠️ L'IA rencontre un problème. <@&${staffRoleId}> merci d'intervenir.` });
        }

        await logTicket(guild, 'Ticket IA ouvert', '#5865f2', [
          { label: 'Ticket', value: nomSalon },
          { label: 'Ouvert par', value: `${member.user.tag}` },
        ], { label: 'Question', value: raison });
      }
    }
  });
};