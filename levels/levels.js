const { RANKS, EXP, COINS, CHANNELS } = require('./config');
const { getUser, saveUser, today } = require('./db');

// Verrou en mémoire : empêche deux handleLevelUp simultanés pour le même userId+niveau
// TTL 90s (> intervalle VoiceXP de 60s, < temps entre deux level-ups légitimes)
const _levelupLock = new Map(); // "userId:newLevel" → timestamp
const LOCK_TTL_MS  = 90_000;

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
  // Buffs personnages (gainMult, kira, gainDebuff)
  const { getGainMult } = require('./buffs');
  multiplier *= getGainMult(user);

  const gained   = Math.floor(baseExp * Math.max(0, multiplier));
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

  // On ne touche JAMAIS lastAnnouncedLevel à la baisse via admin :
  // si quelqu'un perd de l'XP il ne doit pas revoir les annonces des niveaux
  // qu'il a déjà passés. lastAnnouncedLevel reste au max atteint.
  // (seul un reset panel remet à 0)

  saveUser(user);

  if (newLevel !== oldLevel) {
    await handleLevelUp(member, null, oldLevel, newLevel, user);
  }

  return { oldLevel, newLevel, exp: user.exp };
}

// ─── Level-up handler ────────────────────────────────────────
async function handleLevelUp(member, client, oldLevel, newLevel, user) {
  const { generateLevelUpCard, generateRankUpCard } = require('./canvas');
  const { AttachmentBuilder } = require('discord.js');

  const isAdminCall = !client;

  if (!isAdminCall) {
    const lockKey = `${member.id}:${newLevel}`;
    const now     = Date.now();

    // Verrou mémoire : bloque si un handleLevelUp pour ce niveau tourne déjà (ou vient de tourner)
    const lockedAt = _levelupLock.get(lockKey);
    if (lockedAt && now - lockedAt < LOCK_TTL_MS) {
      console.log(`[LevelUp] DOUBLON BLOQUÉ (verrou mémoire) — userId=${member.id} niveau=${newLevel} il y a ${now - lockedAt}ms`);
      return;
    }
    _levelupLock.set(lockKey, now);

    // Check + mark atomique (pas d'await entre les deux = jamais interrompu en JS)
    const fresh = getUser(member.id);
    if ((fresh.lastAnnouncedLevel || 0) >= newLevel) {
      console.log(`[LevelUp] DOUBLON BLOQUÉ (lastAnnouncedLevel=${fresh.lastAnnouncedLevel} >= ${newLevel}) — userId=${member.id}`);
      _levelupLock.delete(lockKey);
      return;
    }
    fresh.lastAnnouncedLevel = newLevel;
    saveUser(fresh);
  } else if (newLevel > oldLevel) {
    // Admin level-up : on marque aussi pour éviter une double annonce naturelle ensuite
    const fresh = getUser(member.id);
    fresh.lastAnnouncedLevel = Math.max(fresh.lastAnnouncedLevel || 0, newLevel);
    saveUser(fresh);
  }
  const guild        = member.guild;
  const levelChannel = guild.channels.cache.get(CHANNELS.LEVELS);
  const rankChannel  = guild.channels.cache.get(CHANNELS.RANKS);

  // Annonce (et applique) un éventuel changement de rang entre deux niveaux consécutifs
  async function announceRankUp(stepOldLevel, stepNewLevel) {
    const stepOldRank = getRankForLevel(stepOldLevel);
    const stepNewRank = getRankForLevel(stepNewLevel);
    if (stepNewRank?.roleId === stepOldRank?.roleId) return;

    if (stepOldRank) {
      const oldRole = guild.roles.cache.get(stepOldRank.roleId);
      if (oldRole && member.roles.cache.has(stepOldRank.roleId))
        await member.roles.remove(oldRole).catch(() => {});
    }
    if (stepNewRank) {
      const alreadyHas = member.roles.cache.has(stepNewRank.roleId);
      if (!alreadyHas) {
        const newRole = guild.roles.cache.get(stepNewRank.roleId);
        if (newRole) await member.roles.add(newRole).catch(() => {});
      }
      if (rankChannel && !alreadyHas && (!stepOldRank || stepNewRank.level > stepOldRank.level)) {
        const rankIdx  = RANKS.indexOf(stepNewRank);
        const nextRank = rankIdx >= 0 && rankIdx + 1 < RANKS.length ? RANKS[rankIdx + 1] : null;
        const buf      = await generateRankUpCard(member, stepNewRank, nextRank, stepNewLevel, user).catch(() => null);
        const files    = buf ? [new AttachmentBuilder(buf, { name: 'rankup.png' })] : [];
        await rankChannel.send({
          content: `🏆 <@${member.id}> **Toutes nos félicitations !** Tu as passé le rang **${stepNewRank.name}** ! Tu obtiens le rôle **${stepNewRank.name}** !`,
          files,
        }).catch(() => {});
      }
    }
  }

  if (newLevel > oldLevel) {
    // Après les éventuels await précédents, vérifier que cette annonce n'est pas déjà dépassée
    // (ex : VoiceXP 14→15 + message 15→16 simultanés : le calcul 15→16 finit en premier,
    //  quand 14→15 arrive on voit que lastAnnouncedLevel=16 > 15 → on skip)
    const stale = getUser(member.id);
    if (!isAdminCall && (stale.lastAnnouncedLevel || 0) > newLevel) {
      console.log(`[LevelUp] SKIP annonce ${oldLevel}→${newLevel} (dépassé par niveau ${stale.lastAnnouncedLevel})`);
      return;
    }

    const span = newLevel - oldLevel;
    const MAX_STEP_ANNOUNCES = 10; // au-delà (ex : gros ajout admin), une seule annonce groupée

    if (span > MAX_STEP_ANNOUNCES) {
      if (levelChannel) {
        const buf   = await generateLevelUpCard(member, oldLevel, newLevel, user).catch(() => null);
        const files = buf ? [new AttachmentBuilder(buf, { name: 'levelup.png' })] : [];
        await levelChannel.send({
          content: `🎉 <@${member.id}> **Félicitations !** Tu es passé du niveau **${oldLevel}** au niveau **${newLevel}** !`,
          files,
        }).catch(() => {});
      }
      await announceRankUp(oldLevel, newLevel);
      if (!isAdminCall) {
        const { updateQuestProgress } = require('./quests');
        updateQuestProgress(guild, member.id, 'levelup', span).catch(() => {});
      }
    } else {
      // Une annonce séparée par niveau franchi : un boost / une grosse récompense qui
      // fait gagner plusieurs niveaux d'un coup affichera 0→1 puis 1→2 plutôt qu'un saut 0→2
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        const stepOld = lvl - 1;

        if (levelChannel) {
          const buf   = await generateLevelUpCard(member, stepOld, lvl, user).catch(() => null);
          const files = buf ? [new AttachmentBuilder(buf, { name: 'levelup.png' })] : [];
          await levelChannel.send({
            content: `🎉 <@${member.id}> **Félicitations !** Tu es passé du niveau **${stepOld}** au niveau **${lvl}** !`,
            files,
          }).catch(() => {});
        }

        await announceRankUp(stepOld, lvl);

        if (!isAdminCall) {
          const { updateQuestProgress } = require('./quests');
          updateQuestProgress(guild, member.id, 'levelup', 1).catch(() => {});
        }
      }
    }
  } else if (isAdminCall && newLevel < oldLevel) {
    // ── Descente de niveau / rang (uniquement via commande admin) ──────
    if (levelChannel) {
      await levelChannel.send({
        content: `<@${member.id}> Tu es redescendu au niveau **${newLevel}**.`,
      }).catch(() => {});
    }

    const oldRank = getRankForLevel(oldLevel);
    const newRank = getRankForLevel(newLevel);

    // Retire TOUS les rangs au-dessus du niveau actuel
    for (const rank of RANKS) {
      if (!newRank || rank.level > newRank.level) {
        const role = guild.roles.cache.get(rank.roleId);
        if (role && member.roles.cache.has(rank.roleId))
          await member.roles.remove(role).catch(() => {});
      }
    }
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
  const { getGainMult } = require('./buffs');
  multiplier *= getGainMult(user);

  const gained  = Math.floor(baseCoins * Math.max(0, multiplier));
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
  getRankForLevel, addExp, addExpAdmin, addCoins, handleLevelUp,
  resetDailyStatsIfNeeded, fmt,
};