'use strict';
const { getAllUsers, saveUser, today } = require('../db');

// Garde en mémoire les users qui ont déjà eu leur annonce aujourd'hui
const announcedToday = new Map();

function canAnnounceQuests(userId) {
  const todayStr = today();
  if (announcedToday.get(userId) === todayStr) return false;
  announcedToday.set(userId, todayStr);
  return true;
}

function startQuestReset(client) {
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() !== 0 || now.getMinutes() !== 0) return;

    // Reset la map des annonces à minuit
    announcedToday.clear();

    const allUsers = getAllUsers();
    let count = 0;

    for (const [id, user] of Object.entries(allUsers)) {
      if (!user.quests) continue;
      user.quests.date = null;
      user.quests.list = [];
      saveUser(user);
      count++;
    }

    console.log(`[QuestTask] Reset quêtes de ${count} utilisateurs à minuit.`);
  }, 60 * 1000);
}

module.exports = { startQuestReset, canAnnounceQuests };