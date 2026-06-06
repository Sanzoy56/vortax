// ============================================================
//  stats.js — Tracker stats : vocal, messages, XP, money
//  Placer dans events/stats.js du projet BOT
//  Brancher dans index.js : stats.init(client)
// ============================================================

const fs   = require("fs");
const path = require("path");
const { RANKS } = require("../levels/config");

const DASHBOARD_URL = "https://vtx-bot.alwaysdata.net/api/stats/push";
const PUSH_SECRET   = "vtx-stats-secret-2024"; // même valeur dans le dashboard

let _client  = null;
let _guildId = null;

// ── Sessions vocales en cours (mémoire) ──
const voiceSessions = new Map();

// ── Calcul du level depuis l'XP total (même formule que levels.js) ──
function levelFromExp(totalExp) {
  let level = 0, needed = 0;
  while (needed + (100 + level * 50) <= totalExp) { needed += (100 + level * 50); level++; }
  return level;
}

// ── Clé par jour ──
function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ── Envoi au dashboard ──
 async function push(type, payload) {
  try {
    console.log("[Stats] Push :", type, payload)
    await fetch(DASHBOARD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-stats-secret": PUSH_SECRET,
      },
      body: JSON.stringify({ type, ...payload }),
    });
  } catch (e) {
    console.error("[Stats] Erreur push :", e.message);
  }
}

// ════════════════════════════════════════════════════════════
//  VOCAL — voiceStateUpdate
// ════════════════════════════════════════════════════════════
async function onVoiceStateUpdate(oldState, newState) {
  const userId = newState.member?.id || oldState.member?.id;
  if (!userId) return;
  const member = newState.member || oldState.member;
  if (member?.user?.bot) return;

  const guildId = (newState.guild || oldState.guild).id;
  const key = `${guildId}:${userId}`;

  const joined  = !oldState.channelId && newState.channelId;
  const left    = oldState.channelId && !newState.channelId;
  const changed = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

  // Mute / sourd / server-mute etc. → on ignore (joined/left/changed tous faux)
  if (!joined && !left && !changed) return;

  // Rejoint un salon
  if (joined) {
    voiceSessions.set(key, {
      start: Date.now(),
      channelId: newState.channelId,
      channelName: newState.channel?.name || "Inconnu",
    });
    return;
  }

  // Quitte définitivement OU change de salon → push durée de l'ancienne session
  if (voiceSessions.has(key)) {
    const session  = voiceSessions.get(key);
    const duration = Math.floor((Date.now() - session.start) / 1000);
    voiceSessions.delete(key);

    if (duration >= 10) {
      await push("vocal", {
        guildId,
        userId,
        channelId: session.channelId,
        channelName: session.channelName,
        duration,
        date: dayKey(),
      });
    }
  }

  // Change de salon → nouvelle session pour le nouveau salon
  if (changed) {
    voiceSessions.set(key, {
      start: Date.now(),
      channelId: newState.channelId,
      channelName: newState.channel?.name || "Inconnu",
    });
  }
}

// ════════════════════════════════════════════════════════════
//  MESSAGES — messageCreate
// ════════════════════════════════════════════════════════════
async function onMessageCreate(message) {
  if (message.author.bot || !message.guild) return;

  await push("message", {
    guildId: message.guild.id,
    userId: message.author.id,
    channelId: message.channel.id,
    channelName: message.channel.name,
    date: dayKey(),
  });
}

// ════════════════════════════════════════════════════════════
//  APPLY PENDING RESETS — applique les resets demandés via le panel
// ════════════════════════════════════════════════════════════
async function applyPendingResets() {
  try {
    const BASE = DASHBOARD_URL.replace("/api/stats/push", "");
    const res  = await fetch(`${BASE}/api/admin/pending-resets`, {
      headers: { "x-stats-secret": PUSH_SECRET },
    });
    const pending = await res.json();
    if (!Object.keys(pending).length) return;

    const dbPath = path.join(__dirname, "../level.json");
    if (!fs.existsSync(dbPath)) return;
    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

    const guild = _client && _guildId ? _client.guilds.cache.get(_guildId) : null;

    let changed = false;
    for (const [userId, flags] of Object.entries(pending)) {
      if (!db[userId]) continue;
      if (flags.xp) {
        db[userId].exp = 0;
        db[userId].level = 0;
        db[userId].lastAnnouncedLevel = 0;
        changed = true;

        // Retirer tous les rôles de rang
        if (guild) {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member) {
            for (const rank of RANKS) {
              const role = guild.roles.cache.get(rank.roleId);
              if (role && member.roles.cache.has(rank.roleId))
                await member.roles.remove(role).catch(() => {});
            }
          }
        }
      }
      if (flags.coins) { db[userId].wallet = 0; db[userId].bank = 0; changed = true; }
    }

    if (changed) {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      console.log("[Stats] Resets appliqués :", Object.keys(pending).join(", "));
    }

    await fetch(`${BASE}/api/admin/pending-resets`, {
      method: "DELETE",
      headers: { "x-stats-secret": PUSH_SECRET },
    });
  } catch (e) {
    console.error("[Stats] Erreur applyPendingResets :", e.message);
  }
}

// ════════════════════════════════════════════════════════════
//  SYNC XP & MONEY — envoie tout le level.json au dashboard
// ════════════════════════════════════════════════════════════
async function syncFromLevelDB(guildId) {
  try {
    const dbPath = path.join(__dirname, "../level.json");
    if (!fs.existsSync(dbPath)) return;
    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

    const users = {};
    for (const [userId, user] of Object.entries(db)) {
      users[userId] = {
        xp: user.exp || 0,
        level: levelFromExp(user.exp || 0),
        balance: (user.wallet || 0) + (user.bank || 0),
      };
    }

    await push("sync_levels", { guildId, users });
  } catch (e) {
    console.error("[Stats] Erreur sync level.json :", e.message);
  }
}

// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = {
  init(client) {
    _client  = client;
    _guildId = process.env.GUILD_ID;

    client.on("voiceStateUpdate", onVoiceStateUpdate);
    client.on("messageCreate", onMessageCreate);

    if (!_guildId) {
      console.warn("[Stats] ⚠️ GUILD_ID manquant dans .env");
    } else {
      syncFromLevelDB(_guildId);
      applyPendingResets();
      setInterval(() => { syncFromLevelDB(_guildId); applyPendingResets(); }, 5 * 60 * 1000);
    }

    console.log("[Stats] ✅ Tracker chargé.");
  },
};