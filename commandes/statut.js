const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Set the bots status (devs only)')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Status text')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type')
                .addChoices(
                    { name: 'Playing', value: 'Playing' },
                    { name: 'Watching', value: 'Watching' },
                    { name: 'Listening', value: 'Listening' },
                    { name: 'Streaming', value: 'Streaming' }
                )
                .setRequired(true)
        ),

    async execute(interaction, client) {

        try {
            const status = interaction.options.getString('status');
            const type = interaction.options.getString('type');

            const map = {
                Playing: ActivityType.Playing,
                Watching: ActivityType.Watching,
                Listening: ActivityType.Listening,
                Streaming: ActivityType.Streaming
            };

            // 🔐 permission AVANT deferReply (IMPORTANT)
            if (interaction.user.id !== '735141652506607716') {
                return interaction.reply({
                    content: '❌ Not allowed',
                    ephemeral: true
                });
            }

            // ⚡ on répond direct proprement
            await interaction.deferReply({ flags: 64 });

            client.user.setActivity(status, {
                type: map[type],
                url: type === 'Streaming' ? 'https://twitch.tv/mrjamesowyt' : undefined
            });

            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setDescription(`✅ Status set to **${status}** (${type})`);

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error('STATUS CMD ERROR:', err);

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply('❌ Error while setting status.');
            } else {
                await interaction.reply({
                    content: '❌ Error while setting status.',
                    ephemeral: true
                });
            }
        }
    }
};