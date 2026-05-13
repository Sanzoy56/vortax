const { CHANNELS } = require('../config');
const { getAllUsers, today } = require('../db');

function startStreakReminder(client) {
  // Vérifie toutes les heures
  setInterval(async () => {
    const now  = new Date();
    // On lance à minuit pile (entre 00h00 et 00h59)
    if (now.getHours() !== 0) return;

    const guild = client.guilds.cache.first();
    if (!guild) return;
    const channel = guild.channels.cache.get(CHANNELS.STREAKS);
    if (!channel) return;

    const todayStr     = today();
    const yesterday    = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr         = yesterday.toISOString().slice(0, 10);

    const allUsers = getAllUsers();
    const lost     = [];
    const active   = [];

    for (const [id, user] of Object.entries(allUsers)) {
      if (user.streak <= 0) continue;
      if (user.lastMessageDate === yStr) {
        // N'a pas parlé aujourd'hui → streak perdu
        lost.push({ id, streak: user.streak });
      } else if (user.lastMessageDate === todayStr) {
        active.push({ id, streak: user.streak });
      }
    }

    if (lost.length > 0) {
      const lines = lost.map(u => `<@${u.id}> a perdu son streak de **${u.streak} jours** 😢`);
      await channel.send(`💔 **Streaks perdus cette nuit :**\n${lines.join('\n')}`);
    }
    if (active.length > 0) {
      const top = active.sort((a, b) => b.streak - a.streak).slice(0, 5);
      const lines = top.map((u, i) => `${i + 1}. <@${u.id}> — **${u.streak} jours** 🔥`);
      await channel.send(`🔥 **Top streaks actifs :**\n${lines.join('\n')}`);
    }

  }, 60 * 60 * 1000); // toutes les heures
}

module.exports = { startStreakReminder };