const { RANKS, EXP, STREAK, COINS, CHANNELS } = require('./config');
const { getUser, saveUser, today } = require('./db');

// ─── Formule EXP pour passer au level suivant ───────────────
function expForLevel(level) {
  return 100 + level * 50;
}

// EXP total cumulé pour atteindre un level donné
function totalExpForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += expForLevel(i);
  return total;
}

// Level correspondant à un total d'EXP cumulé
function levelFromExp(totalExp) {
  let level  = 0;
  let needed = 0;
  while (needed + expForLevel(level) <= totalExp) {
    needed += expForLevel(level);
    level++;
  }
  return level;
}

// EXP dans le level actuel et EXP requise pour le suivant
function expProgress(totalExp) {
  const level    = levelFromExp(totalExp);
  const baseExp  = totalExpForLevel(level);
  const current  = totalExp - baseExp;
  const required = expForLevel(level);
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

  const streakBonus = Math.min(user.streak * STREAK.BONUS_PER_DAY, STREAK.MAX_BONUS);
  let multiplier    = 1 + streakBonus;

  if (user.inventory.tempBoost?.expBoost && Date.now() < user.inventory.tempBoost.expiresAt) {
    multiplier += user.inventory.tempBoost.expBoost;
  }
  if (user.inventory.roleBoost?.expBoost) {
    multiplier += user.inventory.roleBoost.expBoost;
  }

  const gained   = Math.floor(baseExp * multiplier);
  const oldLevel = levelFromExp(user.exp);
  user.exp      += gained;
  const newLevel = levelFromExp(user.exp);

  resetDailyStatsIfNeeded(user);
  user.dailyStats.exp += gained;

  await updateStreak(user, member, client);

  saveUser(user);

  if (newLevel > oldLevel) {
    await handleLevelUp(member, client, oldLevel, newLevel, user);
  }

  return gained;
}

// ─── Ajouter de l'EXP via commande admin (sans multiplicateurs) ─
async function addExpAdmin(member, amount) {
  const user     = getUser(member.id);
  const oldLevel = levelFromExp(user.exp);
  user.exp      += amount;
  if (user.exp < 0) user.exp = 0;
  const newLevel = levelFromExp(user.exp);

  saveUser(user);

  if (newLevel !== oldLevel) {
    await handleLevelUp(member, null, oldLevel, newLevel, user);
  }

  return { oldLevel, newLevel, exp: user.exp };
}

// ─── Streak ─────────────────────────────────────────────────
async function updateStreak(user, member, client) {
  const todayStr = today();
  if (user.lastMessageDate === todayStr) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  if (user.lastMessageDate === yStr) {
    user.streak++;
  } else {
    user.streak = 1;
  }
  user.lastMessageDate = todayStr;

  const guild   = member.guild;
  const channel = guild.channels.cache.get(CHANNELS.STREAKS);
  if (!channel) return;

  const bonusPercent = Math.round(
    Math.min(user.streak * STREAK.BONUS_PER_DAY, STREAK.MAX_BONUS) * 100
  );

  await channel.send(
    `🔥 <@${member.id}> **Streak : ${user.streak} jour${user.streak > 1 ? 's' : ''} !** — Bonus EXP : **+${bonusPercent}%**`
  );
}

// ─── Level-up handler ────────────────────────────────────────
async function handleLevelUp(member, client, oldLevel, newLevel, user) {
  const guild   = member.guild;
  const oldRank = getRankForLevel(oldLevel);
  const newRank = getRankForLevel(newLevel);

  // Toujours envoyer le message de level-up dans le salon dédié
  const levelChannel = guild.channels.cache.get(CHANNELS.LEVELS);
  if (levelChannel) {
    if (newLevel > oldLevel) {
      await levelChannel.send({
        content: `<@${member.id}> **Félicitations !** Tu es passé du niveau **${oldLevel}** au niveau **${newLevel}** !`,
      });
    } else {
      await levelChannel.send({
        content: `<@${member.id}> Tu es redescendu au niveau **${newLevel}**.`,
      });
    }
  }

  // Gérer le changement de rang si besoin
  if (newRank?.roleId !== oldRank?.roleId) {
    if (oldRank) {
      const oldRole = guild.roles.cache.get(oldRank.roleId);
      if (oldRole) await member.roles.remove(oldRole).catch(() => {});
    }
    if (newRank) {
      const newRole = guild.roles.cache.get(newRank.roleId);
      if (newRole) await member.roles.add(newRole).catch(() => {});
    }

    const rankChannel = guild.channels.cache.get(CHANNELS.RANKS);
    if (rankChannel) {
      if (newRank && (!oldRank || newRank.level > oldRank.level)) {
        await rankChannel.send({
          content: `<@${member.id}> **Toutes nos félicitations !** Tu as atteint le rang **${newRank.name}** !`,
        });
      } else if (oldRank) {
        await rankChannel.send({
          content: `<@${member.id}> Tu as perdu le rang **${oldRank.name}**${newRank ? ` et es redescendu en **${newRank.name}**` : ''}.`,
        });
      }
    }
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

  const gained  = Math.floor(baseCoins * multiplier);
  user.wallet  += gained;

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
  getRankForLevel, addExp, addExpAdmin, addCoins, updateStreak,
  resetDailyStatsIfNeeded, fmt,
};