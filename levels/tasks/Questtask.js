'use strict';
// Le reset quotidien n'a plus lieu d'être : les quêtes se renouvellent
// désormais une par une, dès qu'elles sont terminées (voir quests.js).
// On garde canAnnounceQuests si tu l'utilises ailleurs, mais startQuestReset
// n'est plus appelé.

const announcedToday = new Map();

function canAnnounceQuests(userId) {
  const { today } = require('../db');
  const todayStr = today();
  if (announcedToday.get(userId) === todayStr) return false;
  announcedToday.set(userId, todayStr);
  return true;
}

function startQuestReset(client) {
  // no-op — conservé pour compatibilité si appelé ailleurs
}

module.exports = { startQuestReset, canAnnounceQuests };