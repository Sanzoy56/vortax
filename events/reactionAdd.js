'use strict';
const { updateQuestProgress } = require('../levels/quests');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    if (user.bot) return;
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    const guild = reaction.message.guild;
    if (!guild) return;

    await updateQuestProgress(guild, user.id, 'reactions', 1).catch(() => {});
  },
};