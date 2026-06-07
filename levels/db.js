const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'level.json');

// ─── Cache mémoire unique ────────────────────────────────────
// Avant : chaque getUser/saveUser relisait et réécrivait le fichier JSON
// ENTIER à chaque appel. Avec des dizaines d'appels concurrents par seconde
// (messages, vocal, commandes...), deux appels chargeaient chacun un instantané
// du fichier puis sauvegardaient — celui qui écrivait en second écrasait les
// changements de l'autre avec son instantané périmé. Ça provoquait des pertes
// d'XP/coins et des "retours en arrière" de niveau aléatoires.
// Le cache rend chaque lecture/modification atomique (Node est mono-thread,
// aucun "await" entre lecture et écriture ⇒ pas d'entrelacement possible),
// et un flush périodique persiste l'état sur le disque.
let _cache = null;
let _dirty = false;
let _lastMtime = 0;

function statMtime() {
  try { return fs.statSync(DB_PATH).mtimeMs; }
  catch { return 0; }
}

function loadCache() {
  // Si une modification externe au processus (script de reset, édition manuelle...)
  // a touché le fichier depuis notre dernière lecture/écriture, on recharge depuis
  // le disque — sinon notre cache périmé écraserait ces changements au prochain
  // flush (c'est ce qui s'est produit avec le script de reset : le cache du bot
  // gardait l'ancien niveau et le réécrivait par-dessus la remise à zéro).
  if (_dirty) flush();
  const mtime = statMtime();
  if (_cache && mtime !== _lastMtime) _cache = null;
  if (_cache) return _cache;

  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}', 'utf8');
  try { _cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { _cache = {}; }
  _lastMtime = statMtime();
  return _cache;
}

function flush() {
  if (!_dirty || !_cache) return;
  _dirty = false;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(_cache, null, 2), 'utf8');
    _lastMtime = statMtime();
  } catch { _dirty = true; }
}

function markDirty() { _dirty = true; }

const _flushTimer = setInterval(flush, 5_000);
if (_flushTimer.unref) _flushTimer.unref();
process.on('exit', flush);

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
    lastAnnouncedLevel: 0, // niveau le plus haut déjà annoncé
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
  const db = loadCache();
  if (!db[userId]) {
    db[userId] = defaultUser(userId);
    markDirty();
    return db[userId];
  }
  // Fusionne les nouvelles clés EN PLACE (sans remplacer l'objet) : remplacer
  // casserait l'identité de l'objet déjà détenu par d'autres appels getUser en
  // cours, et un saveUser ultérieur sur cette référence périmée écraserait le
  // cache avec un instantané obsolète — exactement le bug de perte de données
  // qu'on cherche à éliminer, juste déplacé du fichier vers l'objet en mémoire.
  const def = defaultUser(userId);
  for (const key of Object.keys(def)) {
    if (!(key in db[userId])) db[userId][key] = def[key];
  }
  return db[userId];
}

function saveUser(user) {
  const db = loadCache();
  db[user.userId] = user;
  markDirty();
}

function getAllUsers() {
  return loadCache();
}

// Force la persistance immédiate sur disque (ex: avant un accès direct au fichier)
function saveAll() {
  flush();
}

function today() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

module.exports = { getUser, saveUser, getAllUsers, saveAll, markDirty, today };
