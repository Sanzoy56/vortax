const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { roles: permRoles } = require('../config.json');
const { getConfig } = require('../config')

// ========== WARNS JSON ==========
const warnsPath = path.join(__dirname, '../warns.json');
const getWarns = () => {
    if (!fs.existsSync(warnsPath)) fs.writeFileSync(warnsPath, '{}');
    return JSON.parse(fs.readFileSync(warnsPath));
};
const saveWarns = (data) => fs.writeFileSync(warnsPath, JSON.stringify(data, null, 2));

// ========== MP SANCTION ==========
const sendDM = async (user, guild, embed) => {
    try { await user.send({ embeds: [embed] }); } catch {}
};

// ========== PERMISSIONS ==========
const getButtons = (member) => {
    const hasMini = member.roles.cache.has(permRoles.miniPerm);
    const hasModo = member.roles.cache.has(permRoles.modoPerm);
    const hasKick = member.roles.cache.has(permRoles.kickPerm);
    const hasBan  = member.roles.cache.has(permRoles.banPerm);
    const buttons = [];
    if (hasBan)  buttons.push(
        new ButtonBuilder().setCustomId('panel_ban').setLabel('Ban').setEmoji('🔨').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('panel_unban').setLabel('Unban').setEmoji('✅').setStyle(ButtonStyle.Success),
    );
    if (hasKick) buttons.push(
        new ButtonBuilder().setCustomId('panel_kick').setLabel('Kick').setEmoji('👢').setStyle(ButtonStyle.Danger),
    );
    if (hasModo) buttons.push(
        new ButtonBuilder().setCustomId('panel_mute').setLabel('Timeout').setEmoji('🔇').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('panel_unmute').setLabel('Untimeout').setEmoji('🔊').setStyle(ButtonStyle.Success),
    );
    if (hasMini || hasModo || hasKick || hasBan) buttons.push(
        new ButtonBuilder().setCustomId('panel_warn').setLabel('Warn').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('panel_unwarn').setLabel('Unwarn').setEmoji('🗑️').setStyle(ButtonStyle.Secondary),
    );
    return buttons;
};

const chunkButtons = (buttons) => {
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5)
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    return rows;
};

module.exports = (client) => {

    // ========== AUTOCOMPLETE ==========
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isAutocomplete()) return;
        if (interaction.commandName !== 'panel') return;
        const focusedValue = interaction.options.getFocused();
        const bans = await interaction.guild.bans.fetch().catch(() => null);
        if (!bans) return interaction.respond([]);
        const choices = bans
            .filter(ban => ban.user.tag.toLowerCase().includes(focusedValue.toLowerCase()))
            .map(ban => ({ name: `${ban.user.tag} (${ban.user.id})`, value: ban.user.id }))
            .slice(0, 25);
        await interaction.respond(choices);
    });

    // ========== COMMANDE /panel ==========
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== 'panel') return;

        const executor = interaction.member;
        const hasAnyPerm = Object.values(permRoles).some(id => executor.roles.cache.has(id));
        if (!hasAnyPerm) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true });

        const banniId = interaction.options.getString('banni');
        if (banniId) {
            if (!executor.roles.cache.has(permRoles.banPerm))
                return interaction.reply({ content: '❌ Tu n\'as pas la permission de débannir.', ephemeral: true });
            await interaction.guild.members.unban(banniId).catch(() => null);
            return interaction.reply({ content: '✅ Le membre a été débanni.', ephemeral: true });
        }

        const target = interaction.options.getMember('membre');
        if (!target) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
        if (target.id === executor.id) return interaction.reply({ content: '❌ Tu ne peux pas te modérer toi-même.', ephemeral: true });

        const rolesListe = target.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'Aucun';
        const warns = getWarns();
        const userWarns = warns[target.id] || [];

        const embed = new EmbedBuilder()
            .setTitle(`Panel de <@${executor.id}>`)
            .setColor(0x2b2d31)
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields({ name: '\u200b', value: [
                `👤 **Membre :** <@${target.id}>`,
                `📅 **Compte créé :** ${target.user.createdAt.toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
                `📥 **Rejoint le serveur :** ${target.joinedAt.toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
                `🎭 **Rôles :** ${rolesListe}`,
                `⚠️ **Warns :** ${userWarns.length}`,
            ].join('\n') })
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        const buttons = getButtons(executor);
        if (buttons.length === 0) return interaction.reply({ content: '❌ Tu n\'as aucune permission.', ephemeral: true });

        const rows = chunkButtons(buttons);
        await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });

        client.panelTargets = client.panelTargets || {};
        client.panelTargets[interaction.id] = { targetId: target.id, interactionId: interaction.id };
    });

    // ========== BOUTONS ==========
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('panel_')) return;

        const action = interaction.customId.replace('panel_', '');
        const panelData = Object.values(client.panelTargets || {}).find(p => p.interactionId === interaction.message.interaction?.id);
        if (!panelData) return interaction.reply({ content: '❌ Session expirée, refais /panel.', ephemeral: true });

        // Pour mute/ban/kick/warn/unwarn on affiche un modal — pas de deferReply
        if (['mute', 'ban', 'kick', 'warn', 'unwarn'].includes(action)) {
            if (action === 'mute') {
                const modal = new ModalBuilder()
                    .setCustomId(`modal_mute_${panelData.targetId}`)
                    .setTitle('Timeout')
                    .addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mute_raison').setLabel('Raison').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mute_duree').setLabel('Durée (ex: 1h, 30m, 2j, 1mois, 1an)').setStyle(TextInputStyle.Short).setRequired(true)),
                    );
                return interaction.showModal(modal);
            }
            const modal = new ModalBuilder()
                .setCustomId(`modal_${action}_${panelData.targetId}`)
                .setTitle(action.charAt(0).toUpperCase() + action.slice(1))
                .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('raison').setLabel('Raison').setStyle(TextInputStyle.Short).setRequired(true)));
            return interaction.showModal(modal);
        }

        // Pour unmute/unban on deferReply
        await interaction.deferReply({ flags: 64 });
        const target = await interaction.guild.members.fetch(panelData.targetId).catch(() => null);
        const config = await getConfig();
        const logChannel = interaction.guild.channels.cache.get(config.log_moderation);
        const footer = { text: 'Team Vortax © 2024 - 2026', iconURL: interaction.guild.iconURL({ dynamic: true }) };

        if (action === 'unmute') {
            if (!target) return interaction.editReply({ content: '❌ Membre introuvable.' });
            await target.timeout(null);
            await interaction.editReply({ content: `✅ **${target.user.tag}** n'est plus en timeout.` });
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder()
                .setTitle('🔊 Timeout Retiré').setColor(0x36393F)
                .setAuthor({ name: target.user.tag, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`👥 **Membre :** <@${target.id}> (\`${target.user.tag}\`)\n🛡️ **Par :** <@${interaction.user.id}> (\`${interaction.user.tag}\`)\n🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>\n🏷️ **ID :** \`${target.id}\``)
                .setTimestamp().setFooter(footer)
            ]});
        }

        if (action === 'unban') {
            await interaction.editReply({ content: '💡 Pour débannir, utilise `/panel` avec le champ **banni** !' });
        }
    });

    // ========== MODALS ==========
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        if (!interaction.customId.startsWith('modal_')) return;

        await interaction.deferReply({ flags: 64 });

        const parts    = interaction.customId.split('_');
        const action   = parts[1];
        const targetId = parts[2];

        const target     = await interaction.guild.members.fetch(targetId).catch(() => null);
        const config     = await getConfig();
        const logChannel = interaction.guild.channels.cache.get(config.log_moderation);
        const footer     = { text: 'Team Vortax © 2024 - 2026', iconURL: interaction.guild.iconURL({ dynamic: true }) };

        // ========== BAN ==========
        if (action === 'ban') {
            const raison = interaction.fields.getTextInputValue('raison');
            if (!target) return interaction.editReply({ content: '❌ Membre introuvable.' });
            await sendDM(target.user, interaction.guild, new EmbedBuilder()
                .setTitle('🔨 Vous avez été banni').setColor(0xff0000)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setDescription(`Vous avez été banni du serveur **${interaction.guild.name}**.\n🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>`)
                .addFields({ name: '📋 Raison', value: `\`\`\`${raison}\`\`\`` }).setTimestamp()
            );
            await target.ban({ reason: raison });
            await interaction.editReply({ content: `✅ **${target.user.tag}** a été banni. Raison : ${raison}` });
        }

        // ========== KICK ==========
        if (action === 'kick') {
            const raison = interaction.fields.getTextInputValue('raison');
            if (!target) return interaction.editReply({ content: '❌ Membre introuvable.' });
            await sendDM(target.user, interaction.guild, new EmbedBuilder()
                .setTitle('👢 Vous avez été expulsé').setColor(0xff6600)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setDescription(`Vous avez été expulsé du serveur **${interaction.guild.name}**.\n🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>`)
                .addFields({ name: '📋 Raison', value: `\`\`\`${raison}\`\`\`` }).setTimestamp()
            );
            await target.kick(raison);
            await interaction.editReply({ content: `✅ **${target.user.tag}** a été expulsé. Raison : ${raison}` });
        }

        // ========== WARN ==========
        if (action === 'warn') {
            const raison = interaction.fields.getTextInputValue('raison');
            const warns  = getWarns();
            if (!warns[targetId]) warns[targetId] = [];
            warns[targetId].push({ raison, par: interaction.user.id, date: new Date().toISOString() });
            saveWarns(warns);
            if (target) await sendDM(target.user, interaction.guild, new EmbedBuilder()
                .setTitle('⚠️ Vous avez reçu un avertissement').setColor(0xfaa61a)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setDescription(`Vous avez reçu un avertissement sur **${interaction.guild.name}**.\n🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>`)
                .addFields({ name: '📋 Raison', value: `\`\`\`${raison}\`\`\`` }).setTimestamp()
            );
            await interaction.editReply({ content: `✅ **${target?.user.tag || targetId}** a reçu un warn. Raison : ${raison}` });
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder()
                .setTitle('⚠️ Membre Warn').setColor(0x36393F)
                .setAuthor({ name: target?.user.tag || targetId, iconURL: target?.user.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(target?.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`👥 **Sanctionné :** <@${targetId}> (\`${target?.user.tag || targetId}\`)\n🛡️ **Par :** <@${interaction.user.id}> (\`${interaction.user.tag}\`)\n🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>\n🏷️ **ID :** \`${targetId}\``)
                .addFields({ name: '📋 Motif', value: `\`\`\`${raison}\`\`\`` }).setTimestamp().setFooter(footer)
            ]});
        }

        // ========== UNWARN ==========
        if (action === 'unwarn') {
            const raison = interaction.fields.getTextInputValue('raison');
            const warns  = getWarns();
            if (warns[targetId]?.length > 0) { warns[targetId].pop(); saveWarns(warns); }
            await interaction.editReply({ content: `✅ Dernier warn de **${target?.user.tag || targetId}** retiré. Raison : ${raison}` });
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder()
                .setTitle('🗑️ Warn Retiré').setColor(0x36393F)
                .setAuthor({ name: target?.user.tag || targetId, iconURL: target?.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`👥 **Membre :** <@${targetId}> (\`${target?.user.tag || targetId}\`)\n🛡️ **Par :** <@${interaction.user.id}> (\`${interaction.user.tag}\`)\n🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>\n🏷️ **ID :** \`${targetId}\``)
                .addFields({ name: '📋 Motif', value: `\`\`\`${raison}\`\`\`` }).setTimestamp().setFooter(footer)
            ]});
        }

        // ========== MUTE ==========
        if (action === 'mute') {
            const raison   = interaction.fields.getTextInputValue('mute_raison');
            const dureeStr = interaction.fields.getTextInputValue('mute_duree');
            const parseTime = (str) => {
                const match = str.match(/^(\d+)(m|h|j|mois|an)$/i);
                if (!match) return null;
                const val = parseInt(match[1]);
                const ms  = { m: 60000, h: 3600000, j: 86400000, mois: 2592000000, an: 31536000000 };
                return val * ms[match[2].toLowerCase()];
            };
            const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000;
            const dureeMs = Math.min(parseTime(dureeStr), MAX_TIMEOUT);
            if (!dureeMs) return interaction.editReply({ content: '❌ Format invalide. Exemples : `30m`, `1h`, `2j`, `1mois`, `1an`' });
            if (!target)  return interaction.editReply({ content: '❌ Membre introuvable.' });
            const demutedAt = Math.floor((Date.now() + dureeMs) / 1000);
            await sendDM(target.user, interaction.guild, new EmbedBuilder()
                .setTitle('🔇 Vous avez été mis en timeout').setColor(0x5865f2)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setDescription(`Vous avez été mis en timeout sur **${interaction.guild.name}**.\n⏳ **Durée :** ${dureeStr}\n🔓 **Démute le :** <t:${demutedAt}:F> (<t:${demutedAt}:R>)\n🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>`)
                .addFields({ name: '📋 Raison', value: `\`\`\`${raison}\`\`\`` }).setTimestamp()
            );
            await target.timeout(dureeMs, raison);
            await interaction.editReply({ content: `✅ **${target.user.tag}** a été mis en timeout pour **${dureeStr}**. Raison : ${raison}` });
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder()
                .setTitle('🔇 Membre Timeout').setColor(0x36393F)
                .setAuthor({ name: target.user.tag, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`👥 **Sanctionné :** <@${target.id}> (\`${target.user.tag}\`)\n🛡️ **Par :** <@${interaction.user.id}> (\`${interaction.user.tag}\`)\n⏳ **Durée :** ${dureeStr}\n🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>\n🏷️ **ID :** \`${target.id}\``)
                .addFields({ name: '📋 Motif', value: `\`\`\`${raison}\`\`\`` }).setTimestamp().setFooter(footer)
            ]});
        }
    });
};