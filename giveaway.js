const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

const GIVEAWAYS_FILE = './giveaways.json';

function loadGiveaways() {
    if (!fs.existsSync(GIVEAWAYS_FILE)) return {};
    return JSON.parse(fs.readFileSync(GIVEAWAYS_FILE, 'utf8'));
}

function saveGiveaways(data) {
    fs.writeFileSync(GIVEAWAYS_FILE, JSON.stringify(data, null, 2));
}

function parseDuration(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
}

async function endGiveaway(client, messageId, channelId) {
    const giveaways = loadGiveaways();
    const giveaway = giveaways[messageId];
    if (!giveaway || giveaway.ended) return;

    giveaway.ended = true;
    saveGiveaways(giveaways);

    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return; // salon supprimé

        // Si le message est introuvable (supprimé), on sort proprement
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message) {
            console.log(`[Giveaway] Message ${messageId} introuvable (supprimé), giveaway ignoré.`);
            return;
        }

        const participants = giveaway.participants || [];

        // Filtrer par rôle si requis
        let eligibles = participants;
        if (giveaway.requiredRole) {
            const guild = channel.guild;
            eligibles = [];
            for (const userId of participants) {
                try {
                    const member = await guild.members.fetch(userId);
                    if (member.roles.cache.has(giveaway.requiredRole)) {
                        eligibles.push(userId);
                    }
                } catch {}
            }
        }

        if (eligibles.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`🎁 ${giveaway.lot}`)
                .setDescription('❌ Pas assez de participants pour ce giveaway !')
                .setFooter({ text: 'Giveaway terminé' })
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [] });
            await channel.send(`❌ Le giveaway **${giveaway.lot}** est terminé mais personne ne peut gagner !`);
            return;
        }

        const shuffled = eligibles.sort(() => Math.random() - 0.5);
        const winners = shuffled.slice(0, Math.min(giveaway.winners, eligibles.length));

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🎁 ${giveaway.lot}`)
            .setDescription(`🏆 **Gagnant(s) :** ${winners.map(w => `<@${w}>`).join(', ')}\n👥 **Participants :** ${participants.length}`)
            .setFooter({ text: 'Giveaway terminé' })
            .setTimestamp();

        await message.edit({ embeds: [embed], components: [] });
        await channel.send(`🎉 Félicitations ${winners.map(w => `<@${w}>`).join(', ')} ! Vous avez gagné **${giveaway.lot}** !`);

    } catch (err) {
        console.error('[Giveaway] Erreur fin giveaway :', err);
    }
}

module.exports = (client) => {
    client.once('ready', () => {
        const giveaways = loadGiveaways();
        const now = Date.now();

        for (const [messageId, giveaway] of Object.entries(giveaways)) {
            if (giveaway.ended) continue;

            const remaining = giveaway.endsAt - now;

            if (remaining <= 0) {
                endGiveaway(client, messageId, giveaway.channelId);
            } else {
                setTimeout(() => endGiveaway(client, messageId, giveaway.channelId), remaining);
            }
        }
    });

    client.on('interactionCreate', async (interaction) => {
        if (interaction.isChatInputCommand() && interaction.commandName === 'giveaway') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Tu dois être administrateur pour lancer un giveaway.', ephemeral: true });
            }

            const lot = interaction.options.getString('lot');
            const dureeStr = interaction.options.getString('durée');
            const nbGagnants = interaction.options.getInteger('gagnants');
            const roleRequis = interaction.options.getRole('role');

            const duree = parseDuration(dureeStr);
            if (!duree) {
                return interaction.reply({ content: '❌ Durée invalide ! Utilise le format : `10m`, `2h`, `1d`', ephemeral: true });
            }

            const endsAt = Date.now() + duree;

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🎁 ${lot}`)
                .setDescription([
                    `> Clique sur le bouton 🎉 pour participer !`,
                    ``,
                    `👥 **Gagnants :** ${nbGagnants}`,
                    `⏱️ **Fin :** <t:${Math.floor(endsAt / 1000)}:R>`,
                    roleRequis ? `🎭 **Rôle requis :** <@&${roleRequis.id}>` : `🌍 **Ouvert à tous**`,
                    ``,
                    `📊 **Participants :** 0`
                ].join('\n'))
                .setFooter({ text: `Lancé par ${interaction.user.tag}` })
                .setTimestamp();

            const button = new ButtonBuilder()
                .setCustomId('giveaway_participer')
                .setLabel('Participer 🎉')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);

            await interaction.reply({ content: '✅ Giveaway lancé !', ephemeral: true });
            const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

            const giveaways = loadGiveaways();
            giveaways[msg.id] = {
                lot,
                winners: nbGagnants,
                endsAt,
                channelId: interaction.channelId,
                requiredRole: roleRequis ? roleRequis.id : null,
                participants: [],
                ended: false
            };
            saveGiveaways(giveaways);

            setTimeout(() => endGiveaway(client, msg.id, interaction.channelId), duree);
        }

        if (interaction.isButton() && interaction.customId === 'giveaway_participer') {
            const giveaways = loadGiveaways();
            const giveaway = giveaways[interaction.message.id];

            if (!giveaway || giveaway.ended) {
                return interaction.reply({ content: '❌ Ce giveaway est terminé.', ephemeral: true });
            }

            const userId = interaction.user.id;

            if (giveaway.participants.includes(userId)) {
                giveaway.participants = giveaway.participants.filter(id => id !== userId);
                saveGiveaways(giveaways);

                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setDescription(interaction.message.embeds[0].description.replace(/📊 \*\*Participants :\*\* \d+/, `📊 **Participants :** ${giveaway.participants.length}`));

                await interaction.update({ embeds: [embed] });
                return interaction.followUp({ content: '❌ Tu t\'es retiré du giveaway.', ephemeral: true });
            }

            if (giveaway.requiredRole) {
                const member = await interaction.guild.members.fetch(userId);
                if (!member.roles.cache.has(giveaway.requiredRole)) {
                    return interaction.reply({ content: `❌ Tu dois avoir le rôle <@&${giveaway.requiredRole}> pour participer !`, ephemeral: true });
                }
            }

            giveaway.participants.push(userId);
            saveGiveaways(giveaways);

            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(interaction.message.embeds[0].description.replace(/📊 \*\*Participants :\*\* \d+/, `📊 **Participants :** ${giveaway.participants.length}`));

            await interaction.update({ embeds: [embed] });
            return interaction.followUp({ content: '✅ Tu participes au giveaway ! Bonne chance 🎉', ephemeral: true });
        }
    });
};