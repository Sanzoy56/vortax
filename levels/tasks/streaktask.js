const { CHANNELS } = require('../config');
const { getAllUsers, saveUser, today } = require('../db');

function startStreakReminder(client) {
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() !== 0) return;

    const guild = client.guilds.cache.first();
    if (!guild) return;
    const channel = guild.channels.cache.get(CHANNELS.STREAKS);
    if (!channel) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    const allUsers = getAllUsers();

    for (const [id, user] of Object.entries(allUsers)) {
      if (user.streak <= 0) continue;
      if (user.lastMessageDate !== yStr && user.lastMessageDate !== today()) {
        const oldStreak = user.streak;
        user.streak = 0;
        saveUser(user);
        await channel.send(
          `💔 <@${id}> a perdu son streak de **${oldStreak} jour${oldStreak > 1 ? 's' : ''}** 😢`
        );
      }
    }

  }, 60 * 60 * 1000);
}

module.exports = { startStreakReminder };