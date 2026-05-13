const { RANKS, EXP, STREAK, COINS, CHANNELS } = require('./config');
const { getUser, saveUser, today } = require('./db');

// ─── Formule EXP pour passer au level suivant ───────────────
// Level N → N+1 coûte : 100 + (N * 50)
// Exemple : level 0→1 = 100 XP, level 10→11 = 600 XP
function expForLevel(level) {
  return 100 + level * 50;
}

// EXP total cumulé pour atteindre un level donné
function totalExpForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += expForLevel(i);
  return total;
}

// Level correspondant à un total d'EXP
function levelFromExp(totalExp) {
  let level = 0;
  let needed = 0;
  while (needed + expForLevel(level) <= totalExp) {
    needed += expForLevel(level);
    level++;
  }
  return level;
}

// EXP dans le level actuel et EXP requise pour le suivant
function expProgress(totalExp) {
  const level     = levelFromExp(totalExp);
  const baseExp   = totalExpForLevel(level);
  const current   = totalExp - baseExp;
  const required  = expForLevel(level);
  return { level, current, required };
}

// ─── Rang correspondant à un level ──────────────────────────
function getRankForLevel(level) {
  let rank = null;
  for (const r of RANKS) {
    if (level >= r.level) rank = r;
    else break;
  }
  return rank;
}

// ─── Ajouter de l'EXP et gérer le level-up ──────────────────
async function addExp(member, client, baseExp) {
  const user = getUser(member.id);

  // Calcul des multiplicateurs
  const streakBonus = Math.min(user.streak * STREAK.BONUS_PER_DAY, STREAK.MAX_BONUS);
  let multiplier    = 1 + streakBonus;

  // Boost temporaire EXP
  if (user.inventory.tempBoost?.expBoost && Date.now() < user.inventory.tempBoost.expiresAt) {
    multiplier += user.inventory.tempBoost.expBoost;
  }
  // Boost rôle EXP
  if (user.inventory.roleBoost?.expBoost) {
    multiplier += user.inventory.roleBoost.expBoost;
  }

  const gained      = Math.floor(baseExp * multiplier);
  const oldLevel    = levelFromExp(user.exp);
  user.exp         += gained;
  const newLevel    = levelFromExp(user.exp);

  // Mise à jour stats journalières quêtes
  resetDailyStatsIfNeeded(user);
  user.dailyStats.exp += gained;

  // Streak (message du jour)
  updateStreak(user, member, client);

  saveUser(user);

  // Level-up ?
  if (newLevel > oldLevel) {
    await handleLevelUp(member, client, oldLevel, newLevel, user);
  }

  return gained;
}

// ─── Streak ─────────────────────────────────────────────────
function updateStreak(user, member, client) {
  const todayStr = today();
  if (user.lastMessageDate === todayStr) return; // déjà compté aujourd'hui

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  if (user.lastMessageDate === yStr) {
    user.streak++;
  } else {
    user.streak = 1; // reset
  }
  user.lastMessageDate = todayStr;
}

// ─── Level-up handler ────────────────────────────────────────
async function handleLevelUp(member, client, oldLevel, newLevel, user) {
  const guild   = member.guild;
  const channel = guild.channels.cache.get(CHANNELS.RANKS);
  if (!channel) return;

  // Gestion des rôles de rang
  const oldRank = getRankForLevel(oldLevel);
  const newRank = getRankForLevel(newLevel);

  if (newRank && newRank !== oldRank) {
    // Retirer l'ancien rang
    if (oldRank) {
      const oldRole = guild.roles.cache.get(oldRank.roleId);
      if (oldRole) await member.roles.remove(oldRole).catch(() => {});
    }
    // Donner le nouveau rang
    const newRole = guild.roles.cache.get(newRank.roleId);
    if (newRole) await member.roles.add(newRole).catch(() => {});

    await channel.send({
      content: `🎉 **${member.displayName}** vient d'atteindre le rang **${newRank.name}** en passant au niveau **${newLevel}** ! 🏆`,
    });
  } else {
    await channel.send({
      content: `⬆️ **${member.displayName}** passe au niveau **${newLevel}** !`,
    });
  }
}

// ─── Coins ──────────────────────────────────────────────────
function addCoins(userId, baseCoins) {
  const user = getUser(userId);

  let multiplier = 1;
  if (user.inventory.tempBoost?.coinBoost && Date.now() < user.inventory.tempBoost.expiresAt) {
    multiplier += user.inventory.tempBoost.coinBoost;
  }
  if (user.inventory.roleBoost?.coinBoost) {
    multiplier += user.inventory.roleBoost.coinBoost;
  }

  const gained = Math.floor(baseCoins * multiplier);
  user.wallet += gained;

  resetDailyStatsIfNeeded(user);
  user.dailyStats.coins += gained;

  saveUser(user);
  return gained;
}

// ─── Reset stats journalières ────────────────────────────────
function resetDailyStatsIfNeeded(user) {
  const todayStr = today();
  if (user.dailyStats.date !== todayStr) {
    user.dailyStats = { date: todayStr, messages: 0, coins: 0, exp: 0, commands: 0 };
  }
}

// ─── Format nombre ───────────────────────────────────────────
function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

module.exports = {
  expForLevel, totalExpForLevel, levelFromExp, expProgress,
  getRankForLevel, addExp, addCoins, updateStreak,
  resetDailyStatsIfNeeded, fmt,
};