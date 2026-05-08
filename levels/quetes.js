'use strict';
const { TOUTES_QUETES, REPARTITION_QUETES, SALONS } = require('./config');

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

function tirerQuetes() {
  const liste = [];
  for (const [cat, nb] of Object.entries(REPARTITION_QUETES)) {
    const pool   = TOUTES_QUETES.filter(q => q.cat === cat);
    const tirage = pool.sort(() => Math.random() - 0.5).slice(0, nb);
    for (const q of tirage) liste.push({ id: q.id, progression: 0, completee: false });
  }
  return { date: dateAujourdhui(), liste };
}

function getQuetesJour(user) {
  if (!user.quetes || user.quetes.date !== dateAujourdhui()) {
    user.quetes = tirerQuetes();
  }
  return user.quetes.liste;
}

function avancerQuete(user, idQuete, montant, guild, userId) {
  const quetes = getQuetesJour(user);
  const entry  = quetes.find(q => q.id === idQuete);
  if (!entry || entry.completee) return;

  const def = TOUTES_QUETES.find(q => q.id === idQuete);
  if (!def) return;

  entry.progression = Math.min(entry.progression + montant, def.cible);
  if (entry.progression < def.cible) return;

  entry.completee = true;
  user.xp    += def.xp;
  user.coins += def.coins;

  const salon = guild?.channels.cache.get(SALONS.quetes);
  salon?.send(
    `Toutes nos félicitations <@${userId}>, vous venez d'accomplir la quête **${def.nom}** ! ` +
    `+${def.xp} XP, +${def.coins.toLocaleString()} coins`
  );
}

module.exports = { dateAujourdhui, tirerQuetes, getQuetesJour, avancerQuete };