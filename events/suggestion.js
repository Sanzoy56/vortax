const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// ========== IDs ==========
const SALON_SUGGESTIONS_ID = '1501564691023921283';
const ROLE_AUTORISE_ID     = '1362730545695559840'; // Rôle Membre

module.exports = (client) => {

    // ========== ENREGISTREMENT DE LA COMMANDE SLASH ==========
    client.once('ready', async () => {
        const command = new SlashCommandBuilder()
            .setName('suggestion')
            .setDescription('Soumettre une suggestion');

        await client.application.commands.create(command);
    });

    client.on('interactionCreate', async (interaction) => {

        // ========== COMMANDE /suggestion → ouvre le modal ==========
        if (interaction.isChatInputCommand() && interaction.commandName === 'suggestion') {
            // Vérification du rôle
            const aLeRole = interaction.member.roles.cache.has(ROLE_AUTORISE_ID);
            if (!aLeRole) {
                return interaction.reply({
                    content: '❌ Tu n\'as pas la permission d\'utiliser cette commande.',
                    ephemeral: true,
                });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_suggestion')
                .setTitle('📬 Nouvelle Suggestion');

            const titreInput = new TextInputBuilder()
                .setCustomId('suggestion_titre')
                .setLabel('Titre de ta suggestion')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: Ajouter un salon musique')
                .setRequired(true)
                .setMaxLength(100);

            const descInput = new TextInputBuilder()
                .setCustomId('suggestion_description')
                .setLabel('Description')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explique ta suggestion en détail...')
                .setRequired(true)
                .setMaxLength(1000);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titreInput),
                new ActionRowBuilder().addComponents(descInput),
            );

            await interaction.showModal(modal);
        }

        // ========== SOUMISSION DU MODAL ==========
        if (interaction.isModalSubmit() && interaction.customId === 'modal_suggestion') {
            const titre       = interaction.fields.getTextInputValue('suggestion_titre');
            const description = interaction.fields.getTextInputValue('suggestion_description');
            const membre      = interaction.member;

            const salon = interaction.guild.channels.cache.get(SALON_SUGGESTIONS_ID);
            if (!salon) {
                return interaction.reply({ content: '❌ Salon de suggestions introuvable.', ephemeral: true });
            }

            const now = new Date().toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });

            const embed = new EmbedBuilder()
                .setTitle(`💡 ${titre}`)
                .setDescription(description)
                .setColor(0x5865f2)
                .addFields(
                    { name: '📊 Votes', value: '✅ Pour : **0**\n➖ Neutre : **0**\n❌ Contre : **0**', inline: true },
                    { name: '📌 Statut', value: '⏳ En attente', inline: true },
                )
                .setThumbnail(membre.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setFooter({ text: `Suggéré par ${membre.user.username} • ${now}` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('suggestion_pour')
                    .setLabel('Pour')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('suggestion_neutre')
                    .setLabel('Neutre')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('suggestion_contre')
                    .setLabel('Contre')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Danger),
            );

            await salon.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ Ta suggestion a bien été envoyée dans <#${SALON_SUGGESTIONS_ID}> !`, ephemeral: true });
        }

        // ========== GESTION DES VOTES ==========
        if (interaction.isButton() && ['suggestion_pour', 'suggestion_neutre', 'suggestion_contre'].includes(interaction.customId)) {
            const message = interaction.message;
            const embed   = EmbedBuilder.from(message.embeds[0]);

            // Récupère les votes actuels depuis le champ
            const votesField = embed.data.fields.find(f => f.name === '📊 Votes');
            const matchPour   = votesField.value.match(/Pour : \*\*(\d+)\*\*/);
            const matchNeutre = votesField.value.match(/Neutre : \*\*(\d+)\*\*/);
            const matchContre = votesField.value.match(/Contre : \*\*(\d+)\*\*/);

            let pour   = parseInt(matchPour?.[1]   ?? 0);
            let neutre = parseInt(matchNeutre?.[1] ?? 0);
            let contre = parseInt(matchContre?.[1] ?? 0);

            // Vérifie si l'utilisateur a déjà voté (via le cache des composants)
            // On stocke les voters dans le topic du message via un système simple
            const voterId = interaction.user.id;
            const topicData = message.content || '';
            const voters = topicData ? JSON.parse(topicData) : {};

            if (voters[voterId]) {
                // Annule le vote précédent
                const ancienVote = voters[voterId];
                if (ancienVote === 'pour')   pour--;
                if (ancienVote === 'neutre') neutre--;
                if (ancienVote === 'contre') contre--;

                // Si même bouton → annule simplement le vote
                if (ancienVote === interaction.customId.replace('suggestion_', '')) {
                    delete voters[voterId];
                    await interaction.message.edit({
                        content: JSON.stringify(voters),
                        embeds: [
                            embed.spliceFields(0, 1, {
                                name: '📊 Votes',
                                value: `✅ Pour : **${pour}**\n➖ Neutre : **${neutre}**\n❌ Contre : **${contre}**`,
                                inline: true,
                            })
                        ],
                    });
                    return interaction.reply({ content: '🔄 Ton vote a été retiré.', ephemeral: true });
                }
            }

            // Enregistre le nouveau vote
            const typeVote = interaction.customId.replace('suggestion_', '');
            voters[voterId] = typeVote;
            if (typeVote === 'pour')   pour++;
            if (typeVote === 'neutre') neutre++;
            if (typeVote === 'contre') contre++;

            await interaction.message.edit({
                content: JSON.stringify(voters),
                embeds: [
                    embed.spliceFields(0, 1, {
                        name: '📊 Votes',
                        value: `✅ Pour : **${pour}**\n➖ Neutre : **${neutre}**\n❌ Contre : **${contre}**`,
                        inline: true,
                    })
                ],
            });

            const labels = { pour: '✅ Pour', neutre: '➖ Neutre', contre: '❌ Contre' };
            await interaction.reply({ content: `Tu as voté **${labels[typeVote]}** !`, ephemeral: true });
        }
    });
};