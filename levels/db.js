const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'level.json');

// ─── Helpers ────────────────────────────────────────────────
function load() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}', 'utf8');
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return {}; }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Structure par défaut d'un utilisateur ──────────────────
function defaultUser(userId) {
  return {
    userId,
    exp:      0,
    level:    0,
    wallet:   0,   // argent sur soi
    bank:     0,   // argent en banque
    lastMessageDate: null,  // 'YYYY-MM-DD'
    lastExpGain:     0,     // timestamp ms (cooldown anti-spam)
    rob: {
      lastUsed: 0,          // timestamp ms
    },
    inventory: {
      tempBoost:  null,     // { id, expBoost?, coinBoost?, expiresAt }
      roleBoost:  null,     // { id, expBoost?, coinBoost? }
    },
    quests: {
      date:      null,      // 'YYYY-MM-DD'
      list:      [],        // [{ id, progress, completed }]
    },
    // stats internes pour quêtes
    dailyStats: {
      date:     null,
      messages: 0,
      coins:    0,
      exp:      0,
      commands: 0,
    },
  };
}

// ─── API publique ────────────────────────────────────────────
function getUser(userId) {
  const db   = load();
  if (!db[userId]) db[userId] = defaultUser(userId);
  // merge pour ajouter les nouvelles clés si user existant
  db[userId] = { ...defaultUser(userId), ...db[userId] };
  save(db);
  return db[userId];
}

function saveUser(user) {
  const db = load();
  db[user.userId] = user;
  save(db);
}

function getAllUsers() {
  return load();
}

function today() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

module.exports = { getUser, saveUser, getAllUsers, today };