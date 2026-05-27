// ============================================================
//  stats.js — Tracker stats : vocal, messages, XP, money
//  Placer dans events/stats.js du projet BOT
//  Brancher dans index.js : stats.init(client)
// ============================================================

const fs   = require("fs");
const path = require("path");

const DASHBOARD_URL = "https://vtx-bot.alwaysdata.net/api/stats/push";
const PUSH_SECRET   = "vtx-stats-secret-2024"; // même valeur dans le dashboard

// ── Sessions vocales en cours (mémoire) ──
const voiceSessions = new Map();

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

  // Rejoint un salon
  if (!oldState.channelId && newState.channelId) {
    voiceSessions.set(key, {
      start: Date.now(),
      channelId: newState.channelId,
      channelName: newState.channel?.name || "Inconnu",
    });
  }

  // Quitte un salon
  if (oldState.channelId && voiceSessions.has(key)) {
    const session = voiceSessions.get(key);
    const duration = Math.floor((Date.now() - session.start) / 1000);
    voiceSessions.delete(key);

    if (duration < 10) return;

    await push("vocal", {
      guildId,
      userId,
      channelId: session.channelId,
      channelName: session.channelName,
      duration,
      date: dayKey(),
    });
  }

  // Change de salon → nouvelle session
  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
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
        level: user.level || 0,
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
    client.on("voiceStateUpdate", onVoiceStateUpdate);
    client.on("messageCreate", onMessageCreate);

    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      console.warn("[Stats] ⚠️ GUILD_ID manquant dans .env");
    } else {
      syncFromLevelDB(guildId);
      setInterval(() => syncFromLevelDB(guildId), 5 * 60 * 1000);
    }

    console.log("[Stats] ✅ Tracker chargé.");
  },
};