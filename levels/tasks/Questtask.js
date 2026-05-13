const { getAllUsers, saveUser, today } = require('../db');

// Annonce quêtes 1 seule fois par jour par user (à minuit)
const announcedToday = new Set();

function startQuestReset(client) {
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() !== 0) return;

    const todayStr = today();
    // Reset la liste des annonces à minuit
    announcedToday.clear();

    // Reset les quêtes de tous les users
    const allUsers = getAllUsers();
    for (const [id, user] of Object.entries(allUsers)) {
      if (user.quests?.date !== todayStr) {
        user.quests = { date: null, list: [] }; // sera régénéré à la prochaine interaction
        saveUser(user);
      }
    }

    console.log(`[QuestTask] Quêtes reset pour ${Object.keys(allUsers).length} utilisateurs.`);

  }, 60 * 60 * 1000);
}

// Vérifie si on peut annoncer les quêtes d'un user aujourd'hui
function canAnnounceQuests(userId) {
  const key = `${userId}_${today()}`;
  if (announcedToday.has(key)) return false;
  announcedToday.add(key);
  return true;
}

module.exports = { startQuestReset, canAnnounceQuests };