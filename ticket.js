const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const CATEGORIE_ID = '1416145060285648966';
const STAFF_ROLE_ID = '1497331100782039071';

module.exports = (client) => {

    // Commande !ticket
    client.on('messageCreate', async (message) => {
        if (message.content === '!ticket') {

            const embed = new EmbedBuilder()
                .setTitle('Team Vortax - Support')
                .setDescription(`__Contacter le Support de Team Vortax__
                
Il y a 2 catégories de tickets mis à votre disposition :

🛡️ **Les tickets Gestion Staff** : Pour rejoindre notre équipe de modération, veuillez ouvrir un ticket ci-dessous.

❓ **Les tickets Question / Signalement** : Pour poser une question ou signaler un membre envers l'équipe du staff.

⚠️ Les tickets troll sont interdits et très fortement sanctionnés.`)
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
                        .setStyle(ButtonStyle.Secondary)
                );

            await message.channel.send({ embeds: [embed], components: [row] });
        }

        // -fermer : ferme le ticket
        if (message.content === '-fermer') {
            const channel = message.channel;

            if (!channel.name.startsWith('question-') && !channel.name.startsWith('recrutement-')) {
                return message.reply({ content: '❌ Cette commande ne peut être utilisée que dans un ticket.' });
            }

            const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID);
            if (!isStaff) {
                return message.reply('❌ Seul le staff peut fermer un ticket.');
            }

            await channel.permissionOverwrites.set([
                {
                    id: channel.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: STAFF_ROLE_ID,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
            ]);

            const fermerEmbed = new EmbedBuilder()
                .setTitle('🔒 Ticket fermé')
                .setDescription('Ce ticket a été fermé par le staff.\nUtilisez `-delete` pour supprimer définitivement le salon.')
                .setColor(0xFF0000)
                .setTimestamp();

            await channel.send({ embeds: [fermerEmbed] });
        }

        // -delete : supprime le salon
        if (message.content === '-delete') {
            const channel = message.channel;

            if (!channel.name.startsWith('question-') && !channel.name.startsWith('recrutement-')) {
                return message.reply('❌ Cette commande ne peut être utilisée que dans un ticket.');
            }

            const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID);
            if (!isStaff) {
                return message.reply('❌ Seul le staff peut supprimer un ticket.');
            }

            const deleteEmbed = new EmbedBuilder()
                .setTitle('🗑️ Suppression du ticket')
                .setDescription('Ce salon sera supprimé dans **5 secondes**...')
                .setColor(0xFF0000);

            await channel.send({ embeds: [deleteEmbed] });

            setTimeout(async () => {
                await channel.delete().catch(console.error);
            }, 5000);
        }
    });

    // Boutons et modals
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isButton()) {
            const { customId, member, guild, channel } = interaction;

            // Boutons ticket → modal
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
            }
        }

        // Modal soumis
        if (interaction.isModalSubmit()) {
            const { customId, member, guild } = interaction;

            if (customId === 'modal_ticket_staff' || customId === 'modal_ticket_question') {

                const raison = interaction.fields.getTextInputValue('raison');
                const isStaff = customId === 'modal_ticket_staff';

                const nomSalon = isStaff
                    ? `recrutement-${member.user.username}`
                    : `question-${member.user.username}`;

                const typeTicket = isStaff ? '🛡️ Gestion Staff' : '❓ Question / Signalement';

                const salon = await guild.channels.create({
                    name: nomSalon,
                    parent: CATEGORIE_ID,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: member.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        },
                        {
                            id: STAFF_ROLE_ID,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        },
                    ],
                });

                const now = new Date();
                const dateHeure = now.toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                const ticketEmbed = new EmbedBuilder()
                    .setTitle(typeTicket)
                    .setDescription(`Salut ${member} ! Un <@&${STAFF_ROLE_ID}> va te répondre dans les minutes qui suivent !\nPour fermer le ticket, utilise \`-fermer\` ou \`-delete\` pour le supprimer\n\n**Raison**\n\`\`\`${raison}\`\`\``)
                    .setColor(0x2B2D31)
                    .setFooter({ text: `Team Vortax - Support • ${dateHeure}` });

                await salon.send({
                    content: `${member} <@&${STAFF_ROLE_ID}>`,
                    embeds: [ticketEmbed]
                });

                await interaction.reply({ content: `✅ Ton ticket a été créé : ${salon}`, ephemeral: true });
            }
        }
    });

};