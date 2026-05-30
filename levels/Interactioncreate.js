module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      const { getConfig } = require('../config');
      const cfg = await getConfig();
      if ((cfg.disabled_commands || []).includes(interaction.commandName)) {
        return interaction.reply({ content: `❌ La commande \`/${interaction.commandName}\` est désactivée.`, ephemeral: true });
      }

      const { getUser, saveUser } = require('./db');
      const { resetDailyStatsIfNeeded } = require('./levels');
      const { generateDailyQuests, updateQuestProgress } = require('./quests');

      const user = getUser(interaction.user.id);
      generateDailyQuests(user);
      resetDailyStatsIfNeeded(user);
      user.dailyStats.commands++;
      saveUser(user);
      await updateQuestProgress(interaction.guild, interaction.user.id, 'commands', 1);

      await command.execute(interaction, client);
    } catch (err) {
      console.error(err);
      const msg = { content: '❌ Une erreur est survenue.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  },
};