const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
const config = require('./config.json');
const token = require('./token.json');

// ========== IDs ==========
const STAFF_ROLE_ID       = config.roles?.modoPerm ?? '';
const CATEGORIE_ID        = '1416145060285648966';
const LOGS_TICKETS_ID     = '1416181684679741521';
const LOGS_TRANSCRIPT_ID  = '1473347420648771598';

// ========== HISTORIQUE IA ==========
const ticketHistories = new Map();

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

// ========== GENERATEUR DE TRANSCRIPT HTML ==========
const genererTranscript = async (channel, fermeParMembre) => {
  const messages = [];
  let dernierId  = null;

  while (true) {
    const opts  = { limit: 100 };
    if (dernierId) opts.before = dernierId;
    const batch = await channel.messages.fetch(opts).catch(() => null);
    if (!batch || batch.size === 0) break;
    messages.push(...batch.values());
    dernierId = batch.last().id;
    if (batch.size < 100) break;
  }

  messages.reverse();

  const now       = new Date();
  const dateFr    = now.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const totalMsgs = messages.length;

  const lignesMsgs = messages.map(msg => {
    const auteur  = msg.author;
    const avatar  = auteur.displayAvatarURL({ extension: 'png', size: 64 });
    const pseudo  = msg.member?.displayName || auteur.username;
    const isBot   = auteur.bot;
    const isStaff = msg.member?.roles?.cache?.has(STAFF_ROLE_ID);
    const badge   = isBot ? '<span class="badge bot">BOT</span>' : isStaff ? '<span class="badge staff">STAFF</span>' : '';
    const dateMsgFr = msg.createdAt.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    let contenu = (msg.content || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

    const pj = msg.attachments.map(a => {
      if (a.contentType?.startsWith('image/'))
        return `<img class="attachment-img" src="${a.url}" alt="image">`;
      return `<a class="attachment-file" href="${a.url}" target="_blank">📎 ${a.name}</a>`;
    }).join('');

    const embeds = msg.embeds.map(e => {
      const titre = e.title ? `<div class="embed-title">${e.title}</div>` : '';
      const desc  = e.description ? `<div class="embed-desc">${e.description.replace(/\n/g, '<br>').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : '';
      const color = e.color ? `#${e.color.toString(16).padStart(6, '0')}` : '#5865f2';
      return `<div class="embed" style="border-left-color:${color}">${titre}${desc}</div>`;
    }).join('');

    if (!contenu && !pj && !embeds) return '';

    return `
    <div class="msg">
      <img class="avatar" src="${avatar}" alt="">
      <div class="msg-content">
        <div class="msg-header">
          <span class="pseudo">${pseudo}</span>
          ${badge}
          <span class="date">${dateMsgFr}</span>
        </div>
        <div class="msg-body">${contenu}${pj}${embeds}</div>
      </div>
    </div>`;
  }).filter(Boolean).join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Transcript — ${channel.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=gg+sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #1e1f22; color: #dcddde; font-family: 'gg sans', 'Noto Sans', sans-serif; font-size: 15px; line-height: 1.5; }
  .header { background: linear-gradient(135deg, #111214 0%, #1a1b1e 100%); border-bottom: 1px solid #3a3c41; padding: 0; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
  .header-inner { max-width: 960px; margin: 0 auto; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
  .header-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #5865f2, #7289da); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; box-shadow: 0 0 16px rgba(88,101,242,0.4); }
  .header-info { flex: 1; }
  .header-title { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
  .header-sub { font-size: 13px; color: #8e9297; margin-top: 2px; }
  .header-stats { display: flex; gap: 20px; }
  .stat { text-align: center; }
  .stat-value { font-size: 20px; font-weight: 700; color: #fff; }
  .stat-label { font-size: 11px; color: #8e9297; text-transform: uppercase; letter-spacing: 0.5px; }
  .messages { max-width: 960px; margin: 0 auto; padding: 24px; }
  .msg { display: flex; gap: 14px; padding: 8px 12px; border-radius: 8px; transition: background 0.1s; margin-bottom: 2px; }
  .msg:hover { background: rgba(255,255,255,0.03); }
  .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; object-fit: cover; margin-top: 2px; }
  .msg-content { flex: 1; min-width: 0; }
  .msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
  .pseudo { font-weight: 600; font-size: 15px; color: #fff; }
  .badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
  .badge.staff { background: #5865f2; color: #fff; }
  .badge.bot   { background: #5865f2; color: #fff; opacity: 0.8; }
  .date { font-size: 12px; color: #72767d; }
  .msg-body { color: #dcddde; word-break: break-word; }
  .msg-body strong { font-weight: 700; color: #fff; }
  .msg-body em { font-style: italic; }
  .msg-body code { background: #2b2d31; border: 1px solid #3a3c41; border-radius: 3px; padding: 1px 5px; font-family: 'Consolas', monospace; font-size: 13px; color: #e3e5e8; }
  .attachment-img { max-width: 400px; max-height: 300px; border-radius: 8px; margin-top: 8px; display: block; border: 1px solid #3a3c41; }
  .attachment-file { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; color: #00aff4; text-decoration: none; font-size: 14px; }
  .attachment-file:hover { text-decoration: underline; }
  .embed { margin-top: 8px; background: #2b2d31; border-left: 4px solid #5865f2; border-radius: 0 6px 6px 0; padding: 12px 16px; max-width: 520px; }
  .embed-title { font-weight: 700; color: #fff; margin-bottom: 6px; font-size: 15px; }
  .embed-desc { font-size: 14px; color: #dcddde; }
  .footer { text-align: center; padding: 32px 24px; color: #4f545c; font-size: 13px; border-top: 1px solid #2b2d31; margin-top: 32px; }
  .footer strong { color: #72767d; }
</style>
</head>
<body>
<div class="header">
  <div class="header-inner">
    <div class="header-icon">🎫</div>
    <div class="header-info">
      <div class="header-title">#${channel.name}</div>
      <div class="header-sub">Fermé par ${fermeParMembre?.displayName || 'Staff'} • ${dateFr}</div>
    </div>
    <div class="header-stats">
      <div class="stat">
        <div class="stat-value">${totalMsgs}</div>
        <div class="stat-label">Messages</div>
      </div>
    </div>
  </div>
</div>
<div class="messages">
${lignesMsgs}
</div>
<div class="footer">
  Transcript généré automatiquement par <strong>Team Vortax Bot</strong> • ${dateFr}
</div>
</body>
</html>`;

  return html;
};

// ========== HELPER LOG ACTION TICKET ==========
const logTicket = async (guild, emoji, titre, couleur, fields) => {
  const salon = guild.channels.cache.get(LOGS_TICKETS_ID);
  if (!salon) return;
  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${titre}`)
    .setColor(couleur)
    .addFields(fields)
    .setFooter({ text: 'Team Vortax — Tickets' })
    .setTimestamp();
  await salon.send({ embeds: [embed] }).catch(console.error);
};

module.exports = (client) => {

  // ========== COMMANDES TEXTE ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.member) return;

    const msgChannel = message.channel;

    // ----- Panneau ticket -----
    if (message.content.trim() === '!ticket') {
      const embed = new EmbedBuilder()
        .setTitle('Team Vortax - Support')
        .setDescription(`__Contacter le Support de Team Vortax__
                
Il y a 3 catégories de tickets mis à votre disposition :

<:pointblue:1502098251489218653> **Gestion Staff** : Pour rejoindre notre équipe de modération.

<:pointpurple:1502099424854147153> **Question / Signalement** : Pour poser une question ou signaler un membre.

<:pointred:1502098544163553350> **Assistance IA** : Obtenez une réponse instantanée de notre assistant IA. Le staff sera alerté si nécessaire.

<:warningicon:1502097886794616963> Les tickets troll sont interdits et très fortement sanctionnés.`)
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

    // ----- Fermer ticket -----
    if (message.content.trim() === '-fermer') {
      const isTicket = msgChannel.name.startsWith('question-') || msgChannel.name.startsWith('recrutement-') || msgChannel.name.startsWith('ia-');
      if (!isTicket) return message.reply({ content: '❌ Cette commande ne peut être utilisée que dans un ticket.' });

      const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID);
      if (!isStaff) {
        return message.reply({ content: '❌ Tu ne peux pas fermer ce ticket. Seul le staff est autorisé.', fetchReply: true })
          .then(reply => {
            setTimeout(() => { reply.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
          });
      }

      await message.reply({ content: '📄 Génération du transcript en cours...' });
      ticketHistories.delete(msgChannel.id);

      try {
        const html    = await genererTranscript(msgChannel, message.member);
        const buffer  = Buffer.from(html, 'utf-8');
        const fichier = new AttachmentBuilder(buffer, { name: `transcript-${msgChannel.name}.html` });

        const logsChannel = message.guild.channels.cache.get(LOGS_TRANSCRIPT_ID);
        if (logsChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('📄 Transcript de ticket')
            .setColor(0x5865f2)
            .addFields(
              { name: '🎫 Ticket',    value: `\`${msgChannel.name}\``, inline: true },
              { name: '🔒 Fermé par', value: `${message.member}`,      inline: true },
              { name: '📅 Date',      value: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), inline: true },
            )
            .setFooter({ text: 'Team Vortax — Système de tickets' })
            .setTimestamp();
          await logsChannel.send({ embeds: [logEmbed], files: [fichier] });
        }
      } catch (err) {
        console.error('[Transcript] Erreur :', err);
      }

      await logTicket(message.guild, '🔒', 'Ticket fermé', 0xe74c3c, [
        { name: '🎫 Ticket',    value: `\`${msgChannel.name}\``, inline: true },
        { name: '👤 Fermé par', value: `${message.member}`,      inline: true },
      ]);

      await msgChannel.permissionOverwrites.set([
        { id: msgChannel.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ]);

      const fermerEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket fermé')
        .setDescription('Ce ticket a été fermé par le staff.\nUtilisez `-delete` pour supprimer définitivement le salon.')
        .setColor(0xFF0000)
        .setTimestamp();
      await msgChannel.send({ embeds: [fermerEmbed] });
      return;
    }

    // ----- Supprimer ticket -----
    if (message.content.trim() === '-delete') {
      const isTicket = msgChannel.name.startsWith('question-') || msgChannel.name.startsWith('recrutement-') || msgChannel.name.startsWith('ia-');
      if (!isTicket) return message.reply('❌ Cette commande ne peut être utilisée que dans un ticket.');

      const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID);
      if (!isStaff) {
        return message.reply({ content: '❌ Tu ne peux pas supprimer ce ticket. Seul le staff est autorisé.', fetchReply: true })
          .then(reply => {
            setTimeout(() => { reply.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
          });
      }

      ticketHistories.delete(msgChannel.id);

      await logTicket(message.guild, '🗑️', 'Ticket supprimé', 0x992d22, [
        { name: '🎫 Ticket',       value: `\`${msgChannel.name}\``, inline: true },
        { name: '👤 Supprimé par', value: `${message.member}`,      inline: true },
      ]);

      const deleteEmbed = new EmbedBuilder()
        .setTitle('🗑️ Suppression du ticket')
        .setDescription('Ce salon sera supprimé dans **5 secondes**...')
        .setColor(0xFF0000);
      await msgChannel.send({ embeds: [deleteEmbed] });
      setTimeout(async () => { await msgChannel.delete().catch(console.error); }, 5000);
      return;
    }

    // ========== IA — Réponse automatique dans les tickets IA ==========
    if (!msgChannel.name.startsWith('ia-')) return;
    if (message.content.trim().startsWith('-')) return;

    // ✅ CORRECTION : on ne filtre plus les membres staff
    // Le staff peut écrire librement dans le ticket sans déclencher l'IA
    // MAIS si c'est le membre du ticket qui écrit (même s'il est staff), l'IA doit répondre.
    // On récupère d'abord le state pour savoir si l'IA est active.

    let state = ticketHistories.get(msgChannel.id);
    if (!state) {
      // Le bot a probablement redémarré, on réinitialise le state
      state = { messages: [], iaActive: true };
      ticketHistories.set(msgChannel.id, state);
    }

    // Si l'IA est désactivée (staff déjà notifié), on ignore tout
    if (!state.iaActive) return;

    // ✅ On compare par ID Discord, fiable même si le pseudo contient des caractères spéciaux
    const isStaffMember = message.member.roles.cache.has(STAFF_ROLE_ID);
    const isTicketOwner = message.author.id === state.ownerId;

    // Si c'est un staff qui n'est PAS le créateur du ticket → il intervient manuellement, on ignore
    if (isStaffMember && !isTicketOwner) return;

    // ✅ Ici : c'est le créateur du ticket (staff ou non), l'IA répond
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
        await msgChannel.send({ content: `<@&${STAFF_ROLE_ID}>`, embeds: [staffEmbed] });
      } else {
        const iaEmbed = new EmbedBuilder()
          .setDescription(answer)
          .setColor(0x5865f2)
          .setFooter({ text: '🤖 Assistance IA — Team Vortax' });
        await msgChannel.send({ embeds: [iaEmbed] });
      }
    } catch (err) {
      console.error('[IA Ticket] Erreur Grok :', err);
      await msgChannel.send({ content: `⚠️ Une erreur est survenue avec l'IA. <@&${STAFF_ROLE_ID}> merci d'intervenir.` });
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

      // ----- Tickets Staff / Question -----
      if (customId === 'modal_ticket_staff' || customId === 'modal_ticket_question') {
        await interaction.deferReply({ flags: 64 });

        const raison     = interaction.fields.getTextInputValue('raison');
        const isStaff    = customId === 'modal_ticket_staff';
        const nomSalon   = isStaff ? `recrutement-${member.user.username}` : `question-${member.user.username}`;
        const typeTicket = isStaff ? '🛡️ Gestion Staff' : '❓ Question / Signalement';

        const salon = await guild.channels.create({
          name: nomSalon,
          parent: CATEGORIE_ID,
          permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ],
        });

        const now       = new Date();
        const dateHeure = now.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const ticketEmbed = new EmbedBuilder()
          .setTitle(typeTicket)
          .setDescription(`Salut ${member} ! Un <@&${STAFF_ROLE_ID}> va te répondre dans les minutes qui suivent !\nPour fermer le ticket, utilise \`-fermer\` ou \`-delete\` pour le supprimer\n\n**Raison**\n\`\`\`${raison}\`\`\``)
          .setColor(0x2B2D31)
          .setFooter({ text: `Team Vortax - Support • ${dateHeure}` });

        await salon.send({ content: `${member} <@&${STAFF_ROLE_ID}>`, embeds: [ticketEmbed] });
        await interaction.editReply({ content: `✅ Ton ticket a été créé : ${salon}` });

        await logTicket(guild, '📬', 'Ticket ouvert', 0x2ecc71, [
          { name: '🎫 Ticket',     value: `\`${nomSalon}\``, inline: true },
          { name: '👤 Ouvert par', value: `${member}`,        inline: true },
          { name: '📂 Type',       value: typeTicket,          inline: true },
          { name: '📝 Raison',     value: raison.length > 200 ? raison.slice(0, 200) + '...' : raison, inline: false },
        ]);
      }

      // ----- Ticket IA -----
      if (customId === 'modal_ticket_ia') {
        await interaction.deferReply({ flags: 64 });

        const raison   = interaction.fields.getTextInputValue('raison');
        const nomSalon = `ia-${member.user.username}`;

        const salon = await guild.channels.create({
          name: nomSalon,
          parent: CATEGORIE_ID,
          permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ],
        });

        const now       = new Date();
        const dateHeure = now.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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
            await salon.send({ content: `<@&${STAFF_ROLE_ID}>`, embeds: [staffEmbed] });
          } else {
            const iaEmbed = new EmbedBuilder()
              .setDescription(answer)
              .setColor(0x5865f2)
              .setFooter({ text: '🤖 Assistance IA — Team Vortax' });
            await salon.send({ embeds: [iaEmbed] });
          }
        } catch (err) {
          console.error('[IA Ticket] Erreur Grok :', err);
          await salon.send({ content: `⚠️ L'IA rencontre un problème. <@&${STAFF_ROLE_ID}> merci d'intervenir.` });
        }

        await logTicket(guild, '🤖', 'Ticket IA ouvert', 0x5865f2, [
          { name: '🎫 Ticket',     value: `\`${nomSalon}\``, inline: true },
          { name: '👤 Ouvert par', value: `${member}`,        inline: true },
          { name: '📝 Question',   value: raison.length > 200 ? raison.slice(0, 200) + '...' : raison, inline: false },
        ]);
      }
    }
  });
};