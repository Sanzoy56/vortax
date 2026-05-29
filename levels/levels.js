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
async function addExp(member, client, baseExp, existingUser = null) {
  const user = existingUser || getUser(member.id);

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

  const hadStreak = !!user.lastMessageDate && user.lastMessageDate !== todayStr;

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

  const MILESTONES   = [3, 7, 14, 30, 60, 100, 365];
  const nextMilestone = MILESTONES.find(m => m > user.streak);

  let msg;
  if (user.streak === 1) {
    msg = hadStreak
      ? `💔 <@${member.id}> a perdu son streak… mais repart à 1 ! Bonus EXP : **+${bonusPercent}%**`
      : `🔥 <@${member.id}> a commencé un nouveau streak ! Bonus EXP actuel : **+${bonusPercent}%**`;
  } else {
    const milestoneInfo = nextMilestone
      ? ` · Prochain palier dans **${nextMilestone - user.streak}** jour${nextMilestone - user.streak > 1 ? 's' : ''}`
      : ' · 🏆 Palier maximum atteint !';
    msg = `🔥 <@${member.id}> **Streak : ${user.streak} jour${user.streak > 1 ? 's' : ''} !** — Bonus EXP : **+${bonusPercent}%**${milestoneInfo}`;
  }

  await channel.send(msg);
}

// ─── Level-up handler ────────────────────────────────────────
async function handleLevelUp(member, client, oldLevel, newLevel, user) {
  // Lazy require pour éviter la dépendance circulaire canvas ↔ levels
  const { generateLevelUpCard, generateRankUpCard } = require('./canvas');
  const { AttachmentBuilder } = require('discord.js');

  const guild   = member.guild;
  const oldRank = getRankForLevel(oldLevel);
  const newRank = getRankForLevel(newLevel);

  // ── Message de level-up ──────────────────────────────────
  const levelChannel = guild.channels.cache.get(CHANNELS.LEVELS);
  if (levelChannel) {
    if (newLevel > oldLevel) {
      const buf   = await generateLevelUpCard(member, oldLevel, newLevel, user).catch(() => null);
      const files = buf ? [new AttachmentBuilder(buf, { name: 'levelup.png' })] : [];
      await levelChannel.send({
        content: `🎉 <@${member.id}> **Félicitations !** Tu es passé du niveau **${oldLevel}** au niveau **${newLevel}** !`,
        files,
      }).catch(() => {});
    } else {
      await levelChannel.send({
        content: `<@${member.id}> Tu es redescendu au niveau **${newLevel}**.`,
      }).catch(() => {});
    }
  }

  // ── Changement de rang ───────────────────────────────────
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
    if (rankChannel && newRank && (!oldRank || newRank.level > oldRank.level)) {
      const rankIdx = RANKS.indexOf(newRank);
      const nextRank = rankIdx >= 0 && rankIdx + 1 < RANKS.length ? RANKS[rankIdx + 1] : null;

      const buf   = await generateRankUpCard(member, newRank, nextRank, newLevel, user).catch(() => null);
      const files = buf ? [new AttachmentBuilder(buf, { name: 'rankup.png' })] : [];
      await rankChannel.send({
        content: `🏆 <@${member.id}> **Toutes nos félicitations !** Tu as passé le rang **${newRank.name}** ! Tu obtiens le rôle **${newRank.name}** !`,
        files,
      }).catch(() => {});
    } else if (rankChannel && oldRank) {
      await rankChannel.send({
        content: `<@${member.id}> Tu as perdu le rang **${oldRank.name}**${newRank ? ` et es redescendu en **${newRank.name}**` : ''}.`,
      }).catch(() => {});
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