const { RANKS, EXP, COINS, CHANNELS } = require('./config');
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

  let multiplier = 1;

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

  // updateStreak N'est plus appelé ici — uniquement depuis messageCreate
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

// Dédup contre les double-annonces (race condition lecture fichier)
const _recentAnnounces = new Map();
function _dedup(userId, level) {
  const key = `${userId}_${level}`;
  const ts  = _recentAnnounces.get(key);
  if (ts && Date.now() - ts < 5000) return true;
  _recentAnnounces.set(key, Date.now());
  return false;
}

// ─── Level-up handler ────────────────────────────────────────
async function handleLevelUp(member, client, oldLevel, newLevel, user) {
  const { generateLevelUpCard, generateRankUpCard } = require('./canvas');
  const { AttachmentBuilder } = require('discord.js');

  const isAdminCall = !client;
  // Si deux messages arrivent simultanément et déclenchent le même level-up, on ignore le second
  if (!isAdminCall && _dedup(member.id, newLevel)) return;
  const guild       = member.guild;
  const oldRank     = getRankForLevel(oldLevel);
  const newRank     = getRankForLevel(newLevel);

  // ── Salon level-up ───────────────────────────────────────
  const levelChannel = guild.channels.cache.get(CHANNELS.LEVELS);
  if (levelChannel) {
    if (newLevel > oldLevel) {
      const buf   = await generateLevelUpCard(member, oldLevel, newLevel, user).catch(() => null);
      const files = buf ? [new AttachmentBuilder(buf, { name: 'levelup.png' })] : [];
      await levelChannel.send({
        content: `🎉 <@${member.id}> **Félicitations !** Tu es passé du niveau **${oldLevel}** au niveau **${newLevel}** !`,
        files,
      }).catch(() => {});
    } else if (isAdminCall) {
      // Uniquement pour les commandes admin qui retirent de l'EXP
      await levelChannel.send({
        content: `<@${member.id}> Tu es redescendu au niveau **${newLevel}**.`,
      }).catch(() => {});
    }
  }

  // ── Changement de rang ───────────────────────────────────
  if (newRank?.roleId !== oldRank?.roleId) {
    // Retire l'ancien rôle seulement si le membre l'a encore
    if (oldRank) {
      const oldRole = guild.roles.cache.get(oldRank.roleId);
      if (oldRole && member.roles.cache.has(oldRank.roleId))
        await member.roles.remove(oldRole).catch(() => {});
    }

    const rankChannel = guild.channels.cache.get(CHANNELS.RANKS);

    if (newRank && newLevel > oldLevel) {
      // Montée de rang — ajoute le rôle seulement si pas déjà présent
      const alreadyHas = member.roles.cache.has(newRank.roleId);
      if (!alreadyHas) {
        const newRole = guild.roles.cache.get(newRank.roleId);
        if (newRole) await member.roles.add(newRole).catch(() => {});
      }

      // N'annonce que si le membre n'avait pas déjà ce rang
      if (rankChannel && !alreadyHas && (!oldRank || newRank.level > oldRank.level)) {
        const rankIdx  = RANKS.indexOf(newRank);
        const nextRank = rankIdx >= 0 && rankIdx + 1 < RANKS.length ? RANKS[rankIdx + 1] : null;
        const buf      = await generateRankUpCard(member, newRank, nextRank, newLevel, user).catch(() => null);
        const files    = buf ? [new AttachmentBuilder(buf, { name: 'rankup.png' })] : [];
        await rankChannel.send({
          content: `🏆 <@${member.id}> **Toutes nos félicitations !** Tu as passé le rang **${newRank.name}** ! Tu obtiens le rôle **${newRank.name}** !`,
          files,
        }).catch(() => {});
      }
    } else if (isAdminCall) {
      // Descente de rang via commande admin uniquement
      if (newRank) {
        const newRole = guild.roles.cache.get(newRank.roleId);
        if (newRole && !member.roles.cache.has(newRank.roleId))
          await member.roles.add(newRole).catch(() => {});
      }
      if (rankChannel && oldRank) {
        await rankChannel.send({
          content: `<@${member.id}> Tu as perdu le rang **${oldRank.name}**${newRank ? ` et es redescendu en **${newRank.name}**` : ''}.`,
        }).catch(() => {});
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
  getRankForLevel, addExp, addExpAdmin, addCoins,
  resetDailyStatsIfNeeded, fmt,
};