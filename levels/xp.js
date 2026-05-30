'use strict';
const { RANGS, BOOSTS_PERMANENTS } = require('./config');

async function getConfig() {
  try {
    const res = await fetch('http://localhost:3001/config')
    return await res.json()
  } catch { return {} }
}

// ── Formules ─────────────────────────────────────────────────────────────────

function xpPourNiveau(niveau) {
  if (niveau < 10)  return 800   + niveau * 100;
  if (niveau < 20)  return 2000  + niveau * 200;
  if (niveau < 50)  return 5000  + niveau * 400;
  if (niveau < 100) return 12000 + niveau * 800;
  return 25000 + niveau * 1500;
}

function getRang(niveau) {
  let rang = null;
  for (const r of RANGS) {
    if (niveau >= r.niveau) rang = r;
  }
  return rang;
}

// ── Calcul XP gagné (boosts, malus, perm) ────────────────────────────────────

function calculerXp(base, user, now) {
  let xp = base;
  // boost temporaire
  if (user.boostActif?.expireAt > now) {
    xp = Math.floor(xp * (1 + user.boostActif.bonus));
  } else {
    user.boostActif = null;
  }
  // malus temporaire
  if (user.malusActif?.expireAt > now) {
    xp = Math.floor(xp * (1 + user.malusActif.bonus)); // bonus est négatif
  } else {
    user.malusActif = null;
  }
  // boost permanent
  const perm = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);
  if (perm) xp = Math.floor(xp * (1 + perm.bonus));

  return Math.max(1, xp);
}

// ── Montée de niveau + changement de rang ────────────────────────────────────

async function gererNiveauEtRang(user, ancienNiveau, guild, member, userId) {
  // Monte les niveaux un par un
  while (user.xp >= xpPourNiveau(user.niveau)) {
    user.xp    -= xpPourNiveau(user.niveau);
    user.niveau += 1;
    const cfg = await getConfig()
    const salon = guild.channels.cache.get(cfg.levels);
    salon?.send(`Toutes nos félicitations <@${userId}>, vous venez de passer niveau **${user.niveau}** !`);
  }

  // Descente de niveau (XP retiré par admin)
  while (user.niveau > 0 && user.xp < 0) {
    user.niveau -= 1;
    user.xp     += xpPourNiveau(user.niveau);
  }
  if (user.xp < 0) user.xp = 0;

  // Rang
  const ancienRang  = getRang(ancienNiveau);
  const nouveauRang = getRang(user.niveau);
  if (ancienRang?.role === nouveauRang?.role) return;

  const m = member ?? await guild.members.fetch(userId).catch(() => null);
  if (!m) return;

  // Retire l'ancien rang
  if (ancienRang) await m.roles.remove(ancienRang.role).catch(() => null);

  // Ajoute le nouveau rang
  if (nouveauRang) await m.roles.add(nouveauRang.role).catch(() => null);

  const cfg = await getConfig()
  const salon = guild.channels.cache.get(cfg.rangs);
  if (!salon) return;

  if (!ancienRang || (nouveauRang && nouveauRang.niveau > ancienRang.niveau)) {
    salon.send(`Toutes nos félicitations <@${userId}>, vous venez de passer au rang **${nouveauRang.nom}** !`);
  } else if (ancienRang) {
    salon.send(
      `<@${userId}> a perdu son rang **${ancienRang.nom}**` +
      (nouveauRang ? ` et est redescendu en **${nouveauRang.nom}**` : '') + '.'
    );
  }
}

module.exports = { xpPourNiveau, getRang, calculerXp, gererNiveauEtRang };