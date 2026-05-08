const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');

// ========== CONFIGURATION ==========
const SALONS = {
  niveaux:   '1500132108599955647',
  rangs:     '1500132032016285797',
  streaks:   '1500132131173564586',
  annonces:  '1360971107846590474',
  quetes:    '1500132151381852394',
  commandes: '1497312598062796911',
};

const ADMINS_ROLES = ['1473460100210360370', '1491458130322919435', '1361408552664568100'];

const XP_PAR_MESSAGE      = 120;
const XP_VOCAL_PAR_MINUTE = 60;
const COINS_PAR_MESSAGE   = 115;
const MESSAGE_COOLDOWN_MS = 45 * 1000;
const PURGE_PRIX          = 30000;
const ROB_COOLDOWN_MS     = 4 * 60 * 60 * 1000;
const ROB_ECHEC_CHANCE    = 0.30;
const ROB_PENALITE        = 20000;

const RANGS = [
  { nom: 'Plastique',         role: '1500111867228454952', niveau: 1    },
  { nom: 'Plastique I',       role: '1499486138488848394', niveau: 5    },
  { nom: 'Plastique II',      role: '1500111961722060891', niveau: 10   },
  { nom: 'Plastique III',     role: '1500112003589607475', niveau: 15   },
  { nom: 'Carton',            role: '1500112057855508481', niveau: 20   },
  { nom: 'Carton I',          role: '1500112122858962955', niveau: 25   },
  { nom: 'Carton II',         role: '1500112168866021428', niveau: 30   },
  { nom: 'Carton III',        role: '1500112194329903356', niveau: 35   },
  { nom: 'Bronze',            role: '1500112232854585404', niveau: 40   },
  { nom: 'Bronze I',          role: '1500112321689682070', niveau: 47   },
  { nom: 'Bronze II',         role: '1500112503215099954', niveau: 54   },
  { nom: 'Bronze III',        role: '1500112549113233428', niveau: 61   },
  { nom: 'Fer',               role: '1500112592327147550', niveau: 70   },
  { nom: 'Fer I',             role: '1500112650389164102', niveau: 80   },
  { nom: 'Fer II',            role: '1500112726079574187', niveau: 90   },
  { nom: 'Fer III',           role: '1500112767112446023', niveau: 100  },
  { nom: 'Or',                role: '1500112824020766720', niveau: 115  },
  { nom: 'Or I',              role: '1500112880970891446', niveau: 130  },
  { nom: 'Or II',             role: '1500112924897968159', niveau: 145  },
  { nom: 'Or III',            role: '1500112962097123360', niveau: 160  },
  { nom: 'Diamant',           role: '1500113000458354870', niveau: 180  },
  { nom: 'Diamant I',         role: '1500113050953449693', niveau: 200  },
  { nom: 'Diamant II',        role: '1500113089561886790', niveau: 225  },
  { nom: 'Diamant III',       role: '1500113148076884009', niveau: 250  },
  { nom: 'Emeraude',          role: '1500113212455125135', niveau: 280  },
  { nom: 'Emeraude I',        role: '1500113268386168982', niveau: 310  },
  { nom: 'Emeraude II',       role: '1500113309565845775', niveau: 340  },
  { nom: 'Emeraude III',      role: '1500113348396843118', niveau: 370  },
  { nom: 'Rubis',             role: '1500113510011768982', niveau: 410  },
  { nom: 'Rubis I',           role: '1500113611174182932', niveau: 450  },
  { nom: 'Rubis II',          role: '1500113574314508390', niveau: 490  },
  { nom: 'Rubis III',         role: '1500113692631760896', niveau: 530  },
  { nom: 'Legendaire',        role: '1500113765654331567', niveau: 580  },
  { nom: 'Legendaire I',      role: '1500113838195081236', niveau: 630  },
  { nom: 'Legendaire II',     role: '1500113881043959918', niveau: 680  },
  { nom: 'Mythique',          role: '1500113863230754946', niveau: 740  },
  { nom: 'Mythique I',        role: '1500114173676224662', niveau: 800  },
  { nom: 'Mythique II',       role: '1500114196401229906', niveau: 860  },
  { nom: 'GOAT',              role: '1500114259667980289', niveau: 950  },
  { nom: 'EXTRA GOAT',        role: '1500114314827141281', niveau: 1050 },
  { nom: 'THE ORIGINAL GOAT', role: '1500114295223095316', niveau: 1200 },
];

// ========== BOOSTS PERMANENTS ==========
const BOOSTS_PERMANENTS = [
  { id: 'perm_1', nom: 'Boosteur Bronze',     bonus: 0.05, prix: 8000000,  roleId: '1500261512764194877' },
  { id: 'perm_2', nom: 'Boosteur Argent',     bonus: 0.10, prix: 12000000, roleId: '1500261615868711114' },
  { id: 'perm_3', nom: 'Boosteur Or',         bonus: 0.15, prix: 16000000, roleId: '1500261594624561303' },
  { id: 'perm_4', nom: 'Boosteur Diamant',    bonus: 0.25, prix: 20000000, roleId: '1500261748819628338' },
  { id: 'perm_5', nom: 'Boosteur Cristal',    bonus: 0.35, prix: 23000000, roleId: '1500261748689600712' },
  { id: 'perm_6', nom: 'Boosteur Legendaire', bonus: 0.45, prix: 25000000, roleId: '1500261896513917049' },
];

const STREAKS_BONUS = [
  { jours: 1,   bonus: 0.02 },
  { jours: 8,   bonus: 0.04 },
  { jours: 15,  bonus: 0.06 },
  { jours: 31,  bonus: 0.09 },
  { jours: 46,  bonus: 0.12 },
  { jours: 61,  bonus: 0.15 },
  { jours: 91,  bonus: 0.18 },
  { jours: 181, bonus: 0.20 },
];

const BOOSTS = [
  { id: 'boost_1', nom: '+30% XP 20min', bonus: 0.30, duree: 20 * 60 * 1000, prix: 80000  },
  { id: 'boost_2', nom: '+40% XP 30min', bonus: 0.40, duree: 30 * 60 * 1000, prix: 100000 },
  { id: 'boost_3', nom: '+50% XP 10min', bonus: 0.50, duree: 10 * 60 * 1000, prix: 350000 },
  { id: 'boost_4', nom: '+25% XP 1h',    bonus: 0.25, duree: 60 * 60 * 1000, prix: 120000 },
  { id: 'boost_5', nom: '+60% XP 15min', bonus: 0.60, duree: 15 * 60 * 1000, prix: 200000 },
  { id: 'boost_6', nom: '+75% XP 5min',  bonus: 0.75, duree: 5  * 60 * 1000, prix: 500000 },
];

const ITEMS = [
  { id: 'item_shield', nom: 'Bouclier Anti-Rob', desc: 'Protege contre un vol pendant 2h',        prix: 40000, duree: 2 * 60 * 60 * 1000 },
  { id: 'item_purge',  nom: 'Purge Malus',        desc: 'Supprime immediatement ton malus actif',  prix: 25000, duree: null                },
  { id: 'item_vol2x',  nom: 'Lame Aceree',        desc: 'Double le montant vole au prochain ?rob', prix: 60000, duree: null                },
];

const BOITE_PRIX = 50000;
const BOITE_RECOMPENSES = [
  { type: 'boost', boostId: 'boost_1', label: '+30% XP 20min', chance: 35 },
  { type: 'boost', boostId: 'boost_2', label: '+40% XP 30min', chance: 25 },
  { type: 'boost', boostId: 'boost_3', label: '+50% XP 10min', chance: 15 },
  { type: 'boost', boostId: 'boost_6', label: '+75% XP 5min',  chance: 5  },
  { type: 'malus', bonus: -0.05, duree: 20 * 60 * 1000, label: '-5% XP 20min',      chance: 10 },
  { type: 'malus', bonus: -0.10, duree: 15 * 60 * 1000, label: '-10% XP 15min',     chance: 7  },
  { type: 'malus', bonus: -0.15, duree: 10 * 60 * 1000, label: '-15% XP 10min',     chance: 2  },
  { type: 'coins', montant: -25000,                      label: '-25 000 VTX-Coins', chance: 1  },
];

const TOUTES_QUETES = [
  // ── FACILES ──────────────────────────────────────────────
  { id: 'msg_5',        nom: 'Bavard',             desc: 'Envoyer 5 messages',                        cat: 'Facile',    cible: 5,   xp: 100,  coins: 400  },
  { id: 'msg_10',       nom: 'Causant',            desc: 'Envoyer 10 messages',                       cat: 'Facile',    cible: 10,  xp: 150,  coins: 600  },
  { id: 'voc_10',       nom: 'Present',            desc: 'Rester 10 min en vocal',                    cat: 'Facile',    cible: 10,  xp: 150,  coins: 600  },
  { id: 'evt_matin',    nom: 'Matinal',            desc: 'Envoyer un message avant 9h',               cat: 'Facile',    cible: 1,   xp: 100,  coins: 400  },
  { id: 'evt_nuit',     nom: 'Noctambule',         desc: 'Envoyer un message apres minuit',           cat: 'Facile',    cible: 1,   xp: 100,  coins: 400  },
  { id: 'spe_profil',   nom: 'Curieux',            desc: 'Utiliser la commande ?profil',              cat: 'Facile',    cible: 1,   xp: 80,   coins: 300  },
  { id: 'spe_boutique', nom: 'Commercant',         desc: 'Ouvrir la boutique',                        cat: 'Facile',    cible: 1,   xp: 80,   coins: 300  },
  { id: 'msg_reply',    nom: 'Reactif',            desc: 'Repondre a 5 messages',                     cat: 'Facile',    cible: 5,   xp: 120,  coins: 450  },

  // ── MOYENNES ─────────────────────────────────────────────
  { id: 'msg_30',       nom: 'Intarissable',       desc: 'Envoyer 30 messages',                       cat: 'Moyenne',   cible: 30,  xp: 400,  coins: 1500 },
  { id: 'voc_30',       nom: 'Sociable',           desc: 'Rester 30 min en vocal',                    cat: 'Moyenne',   cible: 30,  xp: 450,  coins: 1800 },
  { id: 'prog_boost',   nom: 'Booste',             desc: 'Activer un boost',                          cat: 'Moyenne',   cible: 1,   xp: 300,  coins: 1200 },
  { id: 'prog_xp500',   nom: 'Accumulateur',       desc: "Gagner 500 XP aujourd'hui",                 cat: 'Moyenne',   cible: 500, xp: 400,  coins: 1500 },
  { id: 'evt_vendredi', nom: 'Vendredi soir',      desc: 'Envoyer 10 messages un vendredi apres 20h', cat: 'Moyenne',   cible: 10,  xp: 350,  coins: 1400 },
  { id: 'evt_weekend',  nom: 'Actif du weekend',   desc: 'Envoyer 20 messages un samedi ou dimanche', cat: 'Moyenne',   cible: 20,  xp: 400,  coins: 1600 },
  { id: 'soc_react10',  nom: 'Expressif',          desc: 'Mettre 10 reactions',                       cat: 'Moyenne',   cible: 10,  xp: 300,  coins: 1200 },
  { id: 'prog_streak',  nom: 'Fidele',             desc: "Maintenir son streak aujourd'hui",          cat: 'Moyenne',   cible: 1,   xp: 250,  coins: 1000 },

  // ── DIFFICILES ───────────────────────────────────────────
  { id: 'msg_75',        nom: 'Machine a ecrire',  desc: 'Envoyer 75 messages',                              cat: 'Difficile', cible: 75,  xp: 900,  coins: 3500 },
  { id: 'voc_90',        nom: 'Accro au micro',    desc: 'Rester 1h30 en vocal',                             cat: 'Difficile', cible: 90,  xp: 1000, coins: 4000 },
  { id: 'prog_xp2000',   nom: 'XP addict',         desc: "Gagner 2000 XP aujourd'hui",                       cat: 'Difficile', cible: 2000,xp: 1000, coins: 4000 },
  { id: 'soc_repVortax', nom: 'Repondre a Vortax', desc: 'Repondre directement a Vortax',                    cat: 'Difficile', cible: 1,   xp: 1200, coins: 5000 },
  { id: 'spe_combo',     nom: 'Combo',             desc: 'Envoyer 30 msgs ET rester 45 min en vocal',        cat: 'Difficile', cible: 1,   xp: 1500, coins: 6000 },
  { id: 'voc_group',     nom: 'Animateur',         desc: 'Etre dans un vocal avec 3+ personnes pendant 1h',  cat: 'Difficile', cible: 60,  xp: 1200, coins: 5000 },
  { id: 'prog_coins',    nom: 'Econome',           desc: "Gagner 10 000 coins aujourd'hui",                  cat: 'Difficile', cible: 10000,xp: 800, coins: 0    },
];

const REPARTITION = {
  Messages:    2,
  Vocal:       2,
  Social:      2,
  Progression: 2,
  Evenement:   1,
  Speciale:    1,
};

// ========== BASE DE DONNEES ==========
const dbPath     = path.join(__dirname, '../levels.json');
const saisonPath = path.join(__dirname, '../saison.json');

const getDB = () => {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '{}');
    return {};
  }
  try {
    const content = fs.readFileSync(dbPath, 'utf8').trim();
    if (!content) {
      fs.writeFileSync(dbPath, '{}');
      return {};
    }
    return JSON.parse(content);
  } catch (err) {
    console.error('[DB] levels.json corrompu, reset:', err.message);
    fs.writeFileSync(dbPath, '{}');
    return {};
  }
};
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

const getSaison = () => {
  if (!fs.existsSync(saisonPath)) {
    const defaut = { numero: 1, debut: Date.now() };
    fs.writeFileSync(saisonPath, JSON.stringify(defaut, null, 2));
    return defaut;
  }
  try {
    const content = fs.readFileSync(saisonPath, 'utf8').trim();
    if (!content) throw new Error('vide');
    return JSON.parse(content);
  } catch {
    const defaut = { numero: 1, debut: Date.now() };
    fs.writeFileSync(saisonPath, JSON.stringify(defaut, null, 2));
    return defaut;
  }
};
const saveSaison = (data) => fs.writeFileSync(saisonPath, JSON.stringify(data, null, 2));

const TROIS_MOIS_MS = 3 * 30 * 24 * 60 * 60 * 1000;

const getUser = (db, userId) => {
  if (!db[userId]) db[userId] = {
    xp: 0, niveau: 0, coins: 0, streak: 0,
    dernierMessage: null, boostActif: null, malusActif: null,
    quetes: null, inventaire: [],
    dernierRob: null,
    shieldActif: null,
    lameProchaineRob: false,
    boostPermanent: null,
  };
  if (!db[userId].inventaire)                    db[userId].inventaire        = [];
  if (db[userId].dernierRob        === undefined) db[userId].dernierRob        = null;
  if (db[userId].shieldActif       === undefined) db[userId].shieldActif       = null;
  if (db[userId].lameProchaineRob  === undefined) db[userId].lameProchaineRob  = false;
  if (db[userId].boostPermanent    === undefined) db[userId].boostPermanent    = null;
  return db[userId];
};

// ========== VERROU PAR UTILISATEUR ==========
const pendingWrites = new Map();

const withUserLock = (userId, fn) => {
  const prev = pendingWrites.get(userId) || Promise.resolve();
  const next = prev.then(() => fn()).catch((err) => {
    console.error(`[Lock] Erreur userId=${userId}:`, err.stack || err);
  });
  pendingWrites.set(userId, next);
  next.finally(() => {
    if (pendingWrites.get(userId) === next) pendingWrites.delete(userId);
  });
  return next;
};

const messageCooldowns = new Map();

// ========== HELPERS ==========
const xpPourNiveau = (niveau) => {
  if (niveau < 10)  return 800   + niveau * 100;
  if (niveau < 20)  return 2000  + niveau * 200;
  if (niveau < 50)  return 5000  + niveau * 400;
  if (niveau < 100) return 12000 + niveau * 800;
  return 25000 + niveau * 1500;
};

const getStreakBonus = (streak) => {
  let bonus = 0;
  for (const s of STREAKS_BONUS) {
    if (streak >= s.jours) bonus = s.bonus;
  }
  return bonus;
};

const getRang = (niveau) => {
  let rang = null;
  for (const r of RANGS) {
    if (niveau >= r.niveau) rang = r;
  }
  return rang;
};

const ouvrirBoite = () => {
  const total = BOITE_RECOMPENSES.reduce((a, b) => a + b.chance, 0);
  let rand = Math.random() * total;
  for (const r of BOITE_RECOMPENSES) {
    rand -= r.chance;
    if (rand <= 0) return r;
  }
  return BOITE_RECOMPENSES[0];
};

const dateAujourdhui = () => new Date().toISOString().slice(0, 10);

const tirerQuetes = () => {
  const liste = [];
  for (const [cat, nb] of Object.entries(REPARTITION)) {
    const pool     = TOUTES_QUETES.filter(q => q.cat === cat);
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, nb);
    for (const q of shuffled) liste.push({ id: q.id, progression: 0, completee: false });
  }
  return { date: dateAujourdhui(), liste };
};

const getQuetesJour = (user) => {
  if (!user.quetes || user.quetes.date !== dateAujourdhui()) user.quetes = tirerQuetes();
  return user.quetes.liste;
};

// ========== RESET MINUIT QUETES ==========
const demarrerResetMinuitQuetes = (client) => {
  let dernierJourReset = dateAujourdhui();

  setInterval(() => {
    const aujourdhui = dateAujourdhui();
    if (aujourdhui === dernierJourReset) return;
    dernierJourReset = aujourdhui;

    const db = getDB();
    let nb = 0;
    for (const userId of Object.keys(db)) {
      db[userId].quetes = tirerQuetes();
      nb++;
    }
    saveDB(db);
    console.log(`[Quetes] Reset minuit pour ${nb} utilisateurs (${aujourdhui})`);

    for (const guild of client.guilds.cache.values()) {
      const salon = guild.channels.cache.get(SALONS.quetes);
      if (salon) salon.send(`Les quetes du jour ont ete renouvelees ! Utilise \`?quetes\` pour decouvrir tes nouvelles quetes.`);
    }
  }, 60 * 1000);
};

// ========== RESTRICTION SALON COMMANDES ==========
const peutUtiliserCommande = (message) => {
  const membre = message.member;
  if (membre && membre.roles.cache.some(r => ADMINS_ROLES.includes(r.id))) return true;
  return message.channel.id === SALONS.commandes;
};

const refuserCommande = async (message) => {
  const guild    = message.guild;
  const salonCmd = guild
    ? guild.channels.cache.find(c => c.name === SALONS.commandes || c.id === SALONS.commandes)
    : null;
  const mention = salonCmd ? `<#${salonCmd.id}>` : `\`#${SALONS.commandes}\``;
  await message.reply({ content: `Les commandes sont reservees au salon ${mention} !` });
};

// ========== QUETES ==========
const avancerQuete = (user, idQuete, montant, guild, userId) => {
  const quetes = getQuetesJour(user);
  const entry  = quetes.find(q => q.id === idQuete);
  if (!entry || entry.completee) return;
  const def = TOUTES_QUETES.find(q => q.id === idQuete);
  if (!def) return;
  entry.progression = Math.min(entry.progression + montant, def.cible);
  if (entry.progression >= def.cible) {
    entry.completee = true;
    user.xp    += def.xp;
    user.coins += def.coins;
    if (guild) {
      const salon = guild.channels.cache.get(SALONS.quetes);
      if (salon) salon.send(
        `Toutes nos felicitations <@${userId}>, vous venez d'accomplir la quete **${def.nom}** ! +${def.xp} XP, +${def.coins.toLocaleString()} coins`
      );
    }
  }
};

// ========== NIVEAU & RANG ==========
const gererNiveauEtRang = async (user, ancienNiveau, guild, member, userId) => {
  // FIX : on monte les niveaux un par un et on envoie un message pour chaque
  while (user.xp >= xpPourNiveau(user.niveau)) {
    user.xp -= xpPourNiveau(user.niveau);
    user.niveau += 1;

    const niveauSalon = guild.channels.cache.get(SALONS.niveaux);
    if (niveauSalon) niveauSalon.send(`Toutes nos felicitations <@${userId}>, vous venez de passer niveau **${user.niveau}** !`);
  }

  // Gestion du rang : on compare l'ancien et le nouveau rang
  const ancienRang  = getRang(ancienNiveau);
  const nouveauRang = getRang(user.niveau);

  if (ancienRang?.role === nouveauRang?.role) return;

  const m = member || await guild.members.fetch(userId).catch(() => null);
  if (!m) return;

  if (nouveauRang && (!ancienRang || nouveauRang.niveau > ancienRang.niveau)) {
    if (ancienRang) await m.roles.remove(ancienRang.role).catch(() => null);
    await m.roles.add(nouveauRang.role).catch(() => null);
    const rangSalon = guild.channels.cache.get(SALONS.rangs);
    if (rangSalon) rangSalon.send(`Toutes nos felicitations <@${userId}>, vous venez de passer au rang **${nouveauRang.nom}** !`);
  }

  if (ancienRang && (!nouveauRang || ancienRang.niveau > nouveauRang.niveau)) {
    await m.roles.remove(ancienRang.role).catch(() => null);
    if (nouveauRang) await m.roles.add(nouveauRang.role).catch(() => null);
    const rangSalon = guild.channels.cache.get(SALONS.rangs);
    if (rangSalon) rangSalon.send(
      `<@${userId}> a perdu son rang **${ancienRang.nom}**` +
      (nouveauRang ? ` et est redescendu en **${nouveauRang.nom}**` : '') + '.'
    );
  }
};

// ========== RESET SAISON ==========
const resetSaison = async (client) => {
  const saison = getSaison();
  if (Date.now() - saison.debut < TROIS_MOIS_MS) return;
  const db = getDB();
  for (const userId of Object.keys(db)) {
    for (const guild of client.guilds.cache.values()) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) for (const rang of RANGS) await member.roles.remove(rang.role).catch(() => null);
    }
    db[userId] = {
      xp: 0, niveau: 0, coins: 0, streak: 0,
      dernierMessage: null, boostActif: null, malusActif: null,
      quetes: null, inventaire: [],
      dernierRob: null, shieldActif: null, lameProchaineRob: false, boostPermanent: null,
    };
  }
  saveDB(db);
  const nouvelleSaison = { numero: saison.numero + 1, debut: Date.now() };
  saveSaison(nouvelleSaison);
  for (const guild of client.guilds.cache.values()) {
    const salon = guild.channels.cache.get(SALONS.annonces);
    if (salon) salon.send(`La Saison **${saison.numero}** est terminee ! Bonne chance pour la Saison **${nouvelleSaison.numero}** !`);
  }
};

// ====================================================================
module.exports = (client) => {

  resetSaison(client);
  setInterval(() => resetSaison(client), 60 * 60 * 1000);
  demarrerResetMinuitQuetes(client);

  // ========== XP PAR MESSAGE ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const now        = Date.now();
    const dernierXP  = messageCooldowns.get(message.author.id) || 0;
    const enCooldown = now - dernierXP < MESSAGE_COOLDOWN_MS;

    await withUserLock(message.author.id, async () => {
      const db   = getDB();
      const user = getUser(db, message.author.id);

      // ── FIX STREAK : on compare les dates AVANT de mettre à jour dernierMessage ──
      const aujourdhui  = dateAujourdhui();
      const hier        = new Date(now - 86400000).toISOString().slice(0, 10);
      const dernierJour = user.dernierMessage
        ? new Date(user.dernierMessage).toISOString().slice(0, 10)
        : null;

      const estNouveauJour = dernierJour !== aujourdhui;

      if (estNouveauJour) {
        // Premier message de la journée → on met à jour le streak
        if (dernierJour === hier) {
          user.streak += 1; // streak maintenu
        } else if (dernierJour === null || dernierJour < hier) {
          user.streak = 1;  // streak cassé ou premier jour
        }

        // Annonce streak dans le salon dédié (seulement si streak > 1)
        if (user.streak > 1) {
          const streakSalon = message.guild.channels.cache.get(SALONS.streaks);
          if (streakSalon) {
            streakSalon.send(
              `<@${message.author.id}> maintient son streak de **${user.streak} jours** ! (+${Math.round(getStreakBonus(user.streak) * 100)}% XP)`
            );
          }
        }

        avancerQuete(user, 'prog_streak', 1, message.guild, message.author.id);
      }

      // On met à jour dernierMessage APRÈS la vérification du streak
      user.dernierMessage = now;

      // ── XP et coins (avec cooldown) ──
      if (!enCooldown) {
        messageCooldowns.set(message.author.id, now);
        let xpGagne = XP_PAR_MESSAGE;

        if (user.boostActif && user.boostActif.expireAt > now) {
          xpGagne = Math.floor(xpGagne * (1 + user.boostActif.bonus));
        } else {
          user.boostActif = null;
        }
        if (user.malusActif && user.malusActif.expireAt > now) {
          xpGagne = Math.floor(xpGagne * (1 + user.malusActif.bonus));
        } else {
          user.malusActif = null;
        }

        xpGagne = Math.floor(xpGagne * (1 + getStreakBonus(user.streak)));

        const boostPerm = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);
        if (boostPerm) xpGagne = Math.floor(xpGagne * (1 + boostPerm.bonus));

        user.coins += COINS_PAR_MESSAGE;
        user.xp    += xpGagne;

        avancerQuete(user, 'prog_xp500',  xpGagne,           message.guild, message.author.id);
        avancerQuete(user, 'prog_xp2000', xpGagne,           message.guild, message.author.id);
        avancerQuete(user, 'prog_coins',  COINS_PAR_MESSAGE, message.guild, message.author.id);
      }

      // ── Quêtes messages (pas de cooldown) ──
      avancerQuete(user, 'msg_5',   1, message.guild, message.author.id);
      avancerQuete(user, 'msg_10',  1, message.guild, message.author.id);
      avancerQuete(user, 'msg_30',  1, message.guild, message.author.id);
      avancerQuete(user, 'msg_75',  1, message.guild, message.author.id);
      if (message.reference) avancerQuete(user, 'msg_reply', 1, message.guild, message.author.id);

      const heure = new Date().getHours();
      const jour  = new Date().getDay();
      if (heure < 9)                 avancerQuete(user, 'evt_matin',    1, message.guild, message.author.id);
      if (heure === 0)               avancerQuete(user, 'evt_nuit',     1, message.guild, message.author.id);
      if (jour === 5 && heure >= 20) avancerQuete(user, 'evt_vendredi', 1, message.guild, message.author.id);
      if (jour === 0 || jour === 6)  avancerQuete(user, 'evt_weekend',  1, message.guild, message.author.id);

      const qCombo = user.quetes?.liste?.find(q => q.id === 'spe_combo');
      if (qCombo && !qCombo.completee) {
        const qMsg = user.quetes.liste.find(q => q.id === 'msg_30');
        const qVoc = user.quetes.liste.find(q => q.id === 'voc_30');
        if (qMsg?.completee && qVoc?.completee)
          avancerQuete(user, 'spe_combo', 1, message.guild, message.author.id);
      }

      const VORTAX_ID = '1405637417272086588';
      if (message.reference && message.mentions.users.has(VORTAX_ID))
        avancerQuete(user, 'soc_repVortax', 1, message.guild, message.author.id);

      const ancienNiveau = user.niveau;
      await gererNiveauEtRang(user, ancienNiveau, message.guild, null, message.author.id);
      saveDB(db);
    });
  });

  // ========== XP VOCAL ==========
  const vocalTimers    = new Map();
  const silenceMinutes = new Map();

  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.member?.id ?? oldState.member?.id;
    if (!userId) return;
    const membre = newState.member || oldState.member;
    if (membre?.user?.bot) return;

    const rejoint = !oldState.channelId && newState.channelId;
    const quitte  = oldState.channelId && !newState.channelId;
    const mute    = newState.selfMute || newState.selfDeaf || newState.serverMute || newState.serverDeaf;

    if (quitte || mute) {
      const interval = vocalTimers.get(userId);
      if (interval) { clearInterval(interval); vocalTimers.delete(userId); }
      silenceMinutes.delete(userId);
    }

    if (rejoint && !mute) {
      if (!silenceMinutes.has(userId)) silenceMinutes.set(userId, 0);

      const interval = setInterval(async () => {
        const guild      = newState.guild;
        const membreLive = guild.members.cache.get(userId);

        if (!membreLive || !membreLive.voice.channelId) {
          clearInterval(interval);
          vocalTimers.delete(userId);
          silenceMinutes.delete(userId);
          return;
        }
        if (membreLive.voice.serverMute || membreLive.voice.serverDeaf) return;

        const channel = guild.channels.cache.get(membreLive.voice.channelId);
        if (!channel) return;

        const membresActifs = channel.members.filter(
          m => !m.user.bot && !m.voice.selfMute && !m.voice.selfDeaf
             && !m.voice.serverMute && !m.voice.serverDeaf
        );
        if (membresActifs.size < 2) return;

        await withUserLock(userId, async () => {
          const db   = getDB();
          const user = getUser(db, userId);
          const now  = Date.now();

          let xpGagne = XP_VOCAL_PAR_MINUTE;
          if (user.boostActif && user.boostActif.expireAt > now) {
            xpGagne = Math.floor(xpGagne * (1 + user.boostActif.bonus));
          } else { user.boostActif = null; }
          if (user.malusActif && user.malusActif.expireAt > now) {
            xpGagne = Math.floor(xpGagne * (1 + user.malusActif.bonus));
          } else { user.malusActif = null; }
          xpGagne = Math.floor(xpGagne * (1 + getStreakBonus(user.streak)));

          const boostPerm = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);
          if (boostPerm) xpGagne = Math.floor(xpGagne * (1 + boostPerm.bonus));

          user.xp    += xpGagne;
          user.coins += Math.floor(xpGagne * 0.5);

          avancerQuete(user, 'voc_10',  1, guild, userId);
          avancerQuete(user, 'voc_30',  1, guild, userId);
          avancerQuete(user, 'voc_90',  1, guild, userId);
          if (membresActifs.size >= 3) avancerQuete(user, 'voc_group', 1, guild, userId);

          silenceMinutes.set(userId, (silenceMinutes.get(userId) || 0) + 1);

          const ancienNiveau = user.niveau;
          await gererNiveauEtRang(user, ancienNiveau, guild, membreLive, userId);
          saveDB(db);
        });
      }, 60000);

      vocalTimers.set(userId, interval);
    }
  });

  client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    if (silenceMinutes.has(message.author.id)) silenceMinutes.set(message.author.id, 0);
  });

  // ========== COMMANDE ?top ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.toLowerCase() !== '?top') return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    const db      = getDB();
    const entries = Object.entries(db)
      .map(([id, u]) => ({ id, niveau: u.niveau || 0, xp: u.xp || 0 }))
      .sort((a, b) => b.niveau !== a.niveau ? b.niveau - a.niveau : b.xp - a.xp)
      .slice(0, 10);

    const W = 1400, H = 900;
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   '#0f0f1a');
    bg.addColorStop(0.5, '#1a1a2e');
    bg.addColorStop(1,   '#0f0f1a');
    ctx.fillStyle = bg;
    ctx.roundRect(0, 0, W, H, 24);
    ctx.fill();

    const goldGrad = ctx.createLinearGradient(0, 0, W, 0);
    goldGrad.addColorStop(0,   'transparent');
    goldGrad.addColorStop(0.3, '#ffd700');
    goldGrad.addColorStop(0.7, '#ffd700');
    goldGrad.addColorStop(1,   'transparent');
    ctx.fillStyle = goldGrad;
    ctx.fillRect(0, 0, W, 4);
    ctx.fillRect(0, H - 4, W, 4);

    ctx.font      = 'bold 42px Arial';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('Classement VTX - Top 10', W / 2, 60);

    ctx.strokeStyle = 'rgba(255,215,0,0.2)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 90);
    ctx.lineTo(W / 2, H - 20);
    ctx.stroke();

    const COL        = [120, 820];
    const ROWS       = [150, 310, 470, 630, 790];
    const R          = 55;
    const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

    const getStatusColor = (presence) => {
      if (!presence) return '#747f8d';
      switch (presence.status) {
        case 'online': return '#43b581';
        case 'idle':   return '#faa61a';
        case 'dnd':    return '#f04747';
        default:       return '#747f8d';
      }
    };

    for (let i = 0; i < entries.length; i++) {
      const entry  = entries[i];
      const col    = i < 5 ? 0 : 1;
      const row    = i % 5;
      const cx     = COL[col];
      const cy     = ROWS[row];
      const member = await message.guild.members.fetch(entry.id).catch(() => null);
      const rang   = getRang(entry.niveau);
      const statusColor = getStatusColor(member?.presence);
      const nom    = member
        ? member.displayName.replace(/[^\x00-\x7F]/g, '').trim() || member.user.username
        : `User ${entry.id.slice(-4)}`;

      const cardX = col === 0 ? 20 : W / 2 + 20;
      const cardW = W / 2 - 40;
      const cardH = 140;
      const cardY = cy - R - 10;

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.fill();

      ctx.strokeStyle = i < 3 ? `${rankColors[i]}55` : 'rgba(255,255,255,0.08)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.stroke();

      let avatar = null;
      if (member) {
        const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
        avatar = await loadImage(avatarURL).catch(() => null);
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      if (avatar) {
        ctx.drawImage(avatar, cx - R, cy - R, R * 2, R * 2);
      } else {
        ctx.fillStyle = '#2a2a3e';
        ctx.fill();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, R + 4, 0, Math.PI * 2);
      ctx.strokeStyle = statusColor;
      ctx.lineWidth   = 4;
      ctx.stroke();

      const badgeX = cx + R - 8;
      const badgeY = cy - R + 8;
      ctx.fillStyle = i < 3 ? rankColors[i] : '#1a1a2e';
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = i < 3 ? rankColors[i] : '#ffffff33';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.font      = 'bold 13px Arial';
      ctx.fillStyle = i < 3 ? '#000000' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, badgeX, badgeY + 5);

      const tx = cx + R + 18;
      ctx.textAlign = 'left';

      ctx.font      = 'bold 20px Arial';
      ctx.fillStyle = i < 3 ? rankColors[i] : '#ffffff';
      ctx.fillText(nom.length > 16 ? nom.slice(0, 15) + '...' : nom, tx, cy - 22);

      ctx.font      = '15px Arial';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Rang :', tx, cy + 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(rang ? rang.nom : 'Aucun', tx + 58, cy + 5);

      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Level :', tx, cy + 26);
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`${entry.niveau}`, tx + 60, cy + 26);

      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('XP :', tx, cy + 47);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${entry.xp.toLocaleString()}`, tx + 42, cy + 47);
    }

    ctx.font      = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('Team Vortax 2024 - 2026', W / 2, H - 12);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'top10.png' });
    await message.reply({ files: [attachment] });
  });

  // ========== COMMANDE ?quetes ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.toLowerCase() !== '?quetes') return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    await withUserLock(message.author.id, async () => {
      const db    = getDB();
      const user  = getUser(db, message.author.id);
      const liste = getQuetesJour(user);
      avancerQuete(user, 'spe_quetes', 1, message.guild, message.author.id);
      saveDB(db);

      const completees = liste.filter(q => q.completee).length;
      const total      = liste.length;

      const quetesDef = liste.map(entry => {
        const def = TOUTES_QUETES.find(q => q.id === entry.id);
        return def ? { ...def, progression: entry.progression, completee: entry.completee } : null;
      }).filter(Boolean);

      const COLS     = 2;
      const ROWS_CNT = Math.ceil(total / COLS);
      const W        = 1400;
      const PADDING  = 28;
      const HEADER_H = 120;
      const ITEM_H   = 72;
      const ITEM_GAP = 8;
      const COL_GAP  = 16;
      const COL_W    = (W - PADDING * 2 - COL_GAP) / 2;
      const H        = HEADER_H + ROWS_CNT * (ITEM_H + ITEM_GAP) + PADDING;

      const canvas = createCanvas(W, H);
      const ctx    = canvas.getContext('2d');

      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0,   '#0d0d14');
      bgGrad.addColorStop(0.5, '#111120');
      bgGrad.addColorStop(1,   '#0a0a10');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, 20);
      ctx.fill();

      const glow = ctx.createRadialGradient(200, 0, 0, 200, 0, 320);
      glow.addColorStop(0, 'rgba(255,200,50,0.10)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      const glow2 = ctx.createRadialGradient(W - 100, H, 0, W - 100, H, 380);
      glow2.addColorStop(0, 'rgba(130,80,255,0.09)');
      glow2.addColorStop(1, 'transparent');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, 20);
      const borderGrad = ctx.createLinearGradient(0, 0, W, H);
      borderGrad.addColorStop(0,   'rgba(255,200,50,0.45)');
      borderGrad.addColorStop(0.5, 'rgba(130,80,255,0.25)');
      borderGrad.addColorStop(1,   'rgba(255,200,50,0.15)');
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(W / 2, PADDING + 10);
      ctx.lineTo(W / 2, H - PADDING);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const AVATAR_R = 28;
      const AVATAR_X = PADDING + AVATAR_R + 4;
      const AVATAR_Y = PADDING + AVATAR_R + 8;

      ctx.save();
      ctx.beginPath();
      ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R, 0, Math.PI * 2);
      ctx.clip();
      try {
        const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 128 });
        const avatarImg = await loadImage(avatarURL);
        ctx.drawImage(avatarImg, AVATAR_X - AVATAR_R, AVATAR_Y - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
      } catch {
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R + 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth   = 2;
      ctx.stroke();

      const pseudo = message.member?.displayName || message.author.username;
      ctx.font         = 'bold 24px Arial';
      ctx.fillStyle    = '#ffffff';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(
        (pseudo.length > 24 ? pseudo.slice(0, 23) + '...' : pseudo) + ' — Quetes du jour',
        AVATAR_X + AVATAR_R + 16,
        AVATAR_Y - 6
      );

      ctx.font      = '14px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.40)';
      ctx.fillText(`${completees}/${total} completees - reset a minuit`, AVATAR_X + AVATAR_R + 16, AVATAR_Y + 16);

      const GB_X = PADDING;
      const GB_Y = AVATAR_Y + AVATAR_R + 14;
      const GB_W = W - PADDING * 2;
      const GB_H = 7;
      const gPct = completees / total;

      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.roundRect(GB_X, GB_Y, GB_W, GB_H, GB_H / 2);
      ctx.fill();

      if (gPct > 0) {
        const gFill = ctx.createLinearGradient(GB_X, 0, GB_X + GB_W, 0);
        gFill.addColorStop(0,   '#ffd700');
        gFill.addColorStop(0.6, '#ff9d00');
        gFill.addColorStop(1,   '#a855f7');
        ctx.save();
        ctx.shadowColor = '#ffd70055';
        ctx.shadowBlur  = 6;
        ctx.fillStyle   = gFill;
        ctx.beginPath();
        ctx.roundRect(GB_X, GB_Y, Math.max(GB_H, GB_W * gPct), GB_H, GB_H / 2);
        ctx.fill();
        ctx.restore();
      }

      const CAT_COLORS = {
        Messages:    '#5865f2',
        Vocal:       '#eb459e',
        Social:      '#57f287',
        Progression: '#ffd700',
        Evenement:   '#ff9d00',
        Speciale:    '#a855f7',
      };
      const CAT_ICONS = {
        Messages:    'MSG',
        Vocal:       'VOC',
        Social:      'SOC',
        Progression: 'PRG',
        Evenement:   'EVT',
        Speciale:    'SPE',
      };

      for (let i = 0; i < quetesDef.length; i++) {
        const q   = quetesDef[i];
        const col = i % 2;
        const row = Math.floor(i / 2);

        const QX = PADDING + col * (COL_W + COL_GAP);
        const QY = HEADER_H + row * (ITEM_H + ITEM_GAP);
        const QW = COL_W;

        ctx.fillStyle = q.completee ? 'rgba(87,242,135,0.06)' : 'rgba(255,255,255,0.04)';
        ctx.beginPath();
        ctx.roundRect(QX, QY, QW, ITEM_H, 10);
        ctx.fill();

        const catColor = CAT_COLORS[q.cat] || '#888888';
        ctx.fillStyle  = catColor;
        ctx.beginPath();
        ctx.roundRect(QX, QY, 4, ITEM_H, [10, 0, 0, 10]);
        ctx.fill();

        ctx.font         = 'bold 9px Arial';
        ctx.fillStyle    = catColor;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(CAT_ICONS[q.cat] || '?', QX + 14, QY + 16);

        ctx.font      = 'bold 15px Arial';
        ctx.fillStyle = q.completee ? '#57f287' : '#ffffff';
        const nomText = q.nom.length > 28 ? q.nom.slice(0, 27) + '...' : q.nom;
        ctx.fillText(nomText, QX + 14, QY + 33);

        ctx.font      = '12px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        const descText = q.desc.length > 42 ? q.desc.slice(0, 41) + '...' : q.desc;
        ctx.fillText(descText, QX + 14, QY + 50);

        const rewardX = QX + QW - 8;
        ctx.textAlign = 'right';
        ctx.font      = 'bold 12px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`+${q.xp} XP`, rewardX, QY + 22);
        ctx.font      = '11px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(`+${q.coins.toLocaleString()} coins`, rewardX, QY + 37);

        ctx.font      = '11px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillText(`${q.progression}/${q.cible}`, rewardX, QY + ITEM_H - 8);

        const BAR_X = QX + 14;
        const BAR_Y = QY + ITEM_H - 12;
        const BAR_W = QW - 130;
        const BAR_H = 5;
        const pct   = Math.min(q.progression / q.cible, 1);

        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.roundRect(BAR_X, BAR_Y, BAR_W, BAR_H, BAR_H / 2);
        ctx.fill();

        if (pct > 0) {
          const barGrad = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W, 0);
          if (q.completee) {
            barGrad.addColorStop(0, '#57f287');
            barGrad.addColorStop(1, '#00b44c');
          } else {
            barGrad.addColorStop(0, catColor);
            barGrad.addColorStop(1, catColor + '88');
          }
          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(BAR_X, BAR_Y, Math.max(BAR_H, BAR_W * pct), BAR_H, BAR_H / 2);
          ctx.fill();
        }

        if (q.completee) {
          ctx.font         = 'bold 18px Arial';
          ctx.fillStyle    = '#57f287';
          ctx.textAlign    = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', QX + QW - 95, QY + 20);
          ctx.textBaseline = 'alphabetic';
        }
      }

      ctx.font         = '12px Arial';
      ctx.fillStyle    = 'rgba(255,255,255,0.20)';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('Team Vortax 2024 - 2026', W / 2, H - 8);

      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'quetes.png' });
      await message.reply({ files: [attachment] });
    });
  });

  // ========== COMMANDE ?topmoney ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.toLowerCase() !== '?topmoney') return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    const db      = getDB();
    const entries = Object.entries(db)
      .map(([id, u]) => ({ id, coins: u.coins || 0, niveau: u.niveau || 0 }))
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 10);

    const W = 1400, H = 900;
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   '#0f0f1a');
    bg.addColorStop(0.5, '#1a1a2e');
    bg.addColorStop(1,   '#0f0f1a');
    ctx.fillStyle = bg;
    ctx.roundRect(0, 0, W, H, 24);
    ctx.fill();

    const goldGrad = ctx.createLinearGradient(0, 0, W, 0);
    goldGrad.addColorStop(0,   'transparent');
    goldGrad.addColorStop(0.3, '#ffd700');
    goldGrad.addColorStop(0.7, '#ffd700');
    goldGrad.addColorStop(1,   'transparent');
    ctx.fillStyle = goldGrad;
    ctx.fillRect(0, 0, W, 4);
    ctx.fillRect(0, H - 4, W, 4);

    ctx.font      = 'bold 42px Arial';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('Classement VTX - Top 10 Money', W / 2, 60);

    ctx.strokeStyle = 'rgba(255,215,0,0.2)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 90);
    ctx.lineTo(W / 2, H - 20);
    ctx.stroke();

    const COL        = [120, 820];
    const ROWS       = [150, 310, 470, 630, 790];
    const R          = 55;
    const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

    const getStatusColor = (presence) => {
      if (!presence) return '#747f8d';
      switch (presence.status) {
        case 'online': return '#43b581';
        case 'idle':   return '#faa61a';
        case 'dnd':    return '#f04747';
        default:       return '#747f8d';
      }
    };

    const formatCoins = (c) => {
      if (c >= 1000000) return (c / 1000000).toFixed(1) + 'M';
      if (c >= 1000)    return (c / 1000).toFixed(0) + 'k';
      return c.toString();
    };

    for (let i = 0; i < entries.length; i++) {
      const entry  = entries[i];
      const col    = i < 5 ? 0 : 1;
      const row    = i % 5;
      const cx     = COL[col];
      const cy     = ROWS[row];
      const member = await message.guild.members.fetch(entry.id).catch(() => null);
      const rang   = getRang(entry.niveau);
      const statusColor = getStatusColor(member?.presence);
      const nom    = member
        ? member.displayName.replace(/[^\x00-\x7F]/g, '').trim() || member.user.username
        : `User ${entry.id.slice(-4)}`;

      const cardX = col === 0 ? 20 : W / 2 + 20;
      const cardW = W / 2 - 40;
      const cardH = 140;
      const cardY = cy - R - 10;

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.fill();

      ctx.strokeStyle = i < 3 ? `${rankColors[i]}55` : 'rgba(255,255,255,0.08)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.stroke();

      let avatar = null;
      if (member) {
        const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
        avatar = await loadImage(avatarURL).catch(() => null);
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      if (avatar) {
        ctx.drawImage(avatar, cx - R, cy - R, R * 2, R * 2);
      } else {
        ctx.fillStyle = '#2a2a3e';
        ctx.fill();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, R + 4, 0, Math.PI * 2);
      ctx.strokeStyle = statusColor;
      ctx.lineWidth   = 4;
      ctx.stroke();

      const badgeX = cx + R - 8;
      const badgeY = cy - R + 8;
      ctx.fillStyle = i < 3 ? rankColors[i] : '#1a1a2e';
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = i < 3 ? rankColors[i] : '#ffffff33';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.font      = 'bold 13px Arial';
      ctx.fillStyle = i < 3 ? '#000000' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, badgeX, badgeY + 5);

      const tx = cx + R + 18;
      ctx.textAlign = 'left';

      ctx.font      = 'bold 20px Arial';
      ctx.fillStyle = i < 3 ? rankColors[i] : '#ffffff';
      ctx.fillText(nom.length > 16 ? nom.slice(0, 15) + '...' : nom, tx, cy - 22);

      ctx.font      = '15px Arial';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Rang :', tx, cy + 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(rang ? rang.nom : 'Aucun', tx + 58, cy + 5);

      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Coins :', tx, cy + 26);
      ctx.fillStyle = '#ffd700';
      ctx.fillText(formatCoins(entry.coins), tx + 62, cy + 26);

      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Level :', tx, cy + 47);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${entry.niveau}`, tx + 60, cy + 47);
    }

    ctx.font      = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('Team Vortax 2024 - 2026', W / 2, H - 12);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'topmoney.png' });
    await message.reply({ files: [attachment] });
  });

  // ========== BOUTIQUE BOOSTS (?boutique) ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.toLowerCase() !== '?boutique') return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    await withUserLock(message.author.id, async () => {
      const db   = getDB();
      const user = getUser(db, message.author.id);
      avancerQuete(user, 'spe_boutique', 1, message.guild, message.author.id);
      saveDB(db);
    });

    const db   = getDB();
    const user = getUser(db, message.author.id);

    const labelBoost = (b) => {
      const bonus    = `+${Math.round(b.bonus * 100)}%`;
      const dureeMin = b.duree / 60000;
      const duree    = dureeMin >= 60 ? `${dureeMin / 60}h` : `${dureeMin}min`;
      const prix     = b.prix >= 1000 ? `${b.prix / 1000}k` : b.prix;
      return `${bonus} - ${duree} - ${prix}`;
    };

    const boostButtons = BOOSTS.map(b =>
      new ButtonBuilder()
        .setCustomId(`boutique_boost_${b.id}`)
        .setLabel(labelBoost(b))
        .setStyle(ButtonStyle.Primary)
    );
    boostButtons.push(
      new ButtonBuilder()
        .setCustomId('boutique_boost_boite')
        .setLabel('Boite - 50k')
        .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    for (let i = 0; i < boostButtons.length; i += 5)
      rows.push(new ActionRowBuilder().addComponents(boostButtons.slice(i, i + 5)));

    const embed = new EmbedBuilder()
      .setTitle('Boutique Boosts VTX')
      .setColor(0xffd700)
      .setDescription(
        `Ton solde : **${user.coins.toLocaleString()} VTX-Coins**\n` +
        `> Tu peux aussi acheter des items avec **?items**`
      )
      .addFields(
        { name: 'Boosts XP disponibles', value: BOOSTS.map(b => `**${b.nom}** - ${b.prix.toLocaleString()} VTX-Coins`).join('\n') },
        { name: 'Boite Surprise',        value: `**50 000 VTX-Coins** - Gain ou malus aleatoire !\nUtilise **?purge** (${PURGE_PRIX.toLocaleString()} coins) pour retirer un malus.` },
      )
      .setFooter({ text: 'Team Vortax 2024 - 2026', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await message.reply({ embeds: [embed], components: rows });
  });

  // ========== BOUTIQUE ITEMS (?items) ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.toLowerCase() !== '?items') return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    const db   = getDB();
    const user = getUser(db, message.author.id);
    const now  = Date.now();

    const itemButtons = ITEMS.map(item =>
      new ButtonBuilder()
        .setCustomId(`boutique_item_${item.id}`)
        .setLabel(`${item.nom} - ${(item.prix / 1000).toFixed(0)}k`)
        .setStyle(ButtonStyle.Success)
    );

    const rows = [];
    for (let i = 0; i < itemButtons.length; i += 5)
      rows.push(new ActionRowBuilder().addComponents(itemButtons.slice(i, i + 5)));

    const shieldInfo = user.shieldActif && user.shieldActif > now
      ? `Bouclier actif - expire <t:${Math.floor(user.shieldActif / 1000)}:R>`
      : 'Aucun bouclier actif';
    const lameInfo = user.lameProchaineRob
      ? 'Lame Aceree - active au prochain rob'
      : 'Lame Aceree - inactive';

    const embed = new EmbedBuilder()
      .setTitle('Boutique Items VTX')
      .setColor(0x2ecc71)
      .setDescription(
        `Ton solde : **${user.coins.toLocaleString()} VTX-Coins**\n\n` +
        `${shieldInfo}\n${lameInfo}\n\n` +
        `> Tu peux aussi acheter des boosts XP avec **?boutique**`
      )
      .addFields({
        name: 'Items disponibles',
        value: ITEMS.map(item => `**${item.nom}** - ${item.prix.toLocaleString()} VTX-Coins\n*${item.desc}*`).join('\n\n'),
      })
      .setFooter({ text: 'Team Vortax 2024 - 2026', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await message.reply({ embeds: [embed], components: rows });
  });

  // ========== BOUTONS BOUTIQUE BOOSTS ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('boutique_boost_')) return;

    const action = interaction.customId.replace('boutique_boost_', '');

    await withUserLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);
      const now  = Date.now();

      const boost = BOOSTS.find(b => b.id === action);
      if (boost) {
        if (user.coins < boost.prix)
          return interaction.reply({ content: `Il te faut **${boost.prix.toLocaleString()} VTX-Coins**. Tu en as **${user.coins.toLocaleString()}**.`, ephemeral: true });
        user.coins -= boost.prix;
        user.inventaire.push({ type: 'boost', boostId: boost.id, nom: boost.nom, bonus: boost.bonus, duree: boost.duree });
        avancerQuete(user, 'prog_boost', 1, interaction.guild, interaction.user.id);
        saveDB(db);
        return interaction.reply({ content: `**${boost.nom}** ajoute a ton inventaire ! Utilise **?use** pour l'activer.`, ephemeral: true });
      }

      if (action === 'boite') {
        if (user.coins < BOITE_PRIX)
          return interaction.reply({ content: `Il te faut **${BOITE_PRIX.toLocaleString()} VTX-Coins**. Tu en as **${user.coins.toLocaleString()}**.`, ephemeral: true });
        user.coins -= BOITE_PRIX;
        const recompense = ouvrirBoite();
        avancerQuete(user, 'prog_boite', 1, interaction.guild, interaction.user.id);

        let msg = '';
        if (recompense.type === 'boost') {
          const b = BOOSTS.find(b => b.id === recompense.boostId);
          user.inventaire.push({ type: 'boost', boostId: b.id, nom: b.nom, bonus: b.bonus, duree: b.duree });
          msg = `Tu as gagne : **${recompense.label}** ! Ajoute a ton inventaire. Utilise **?use** pour l'activer.`;
        } else if (recompense.type === 'malus') {
          user.malusActif = { bonus: recompense.bonus, expireAt: now + recompense.duree };
          msg = `Malus : **${recompense.label}** ! Expire <t:${Math.floor((now + recompense.duree) / 1000)}:R>\nUtilise **?purge** (${PURGE_PRIX.toLocaleString()} coins) pour l'annuler.`;
        } else if (recompense.type === 'coins') {
          user.coins = Math.max(0, user.coins + recompense.montant);
          msg = `Malus : **${recompense.label}** !`;
        }

        saveDB(db);
        return interaction.reply({ content: msg, ephemeral: true });
      }
    });
  });

  // ========== BOUTONS BOUTIQUE ITEMS ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('boutique_item_')) return;

    const itemId = interaction.customId.replace('boutique_item_', '');

    await withUserLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);
      const now  = Date.now();
      const item = ITEMS.find(i => i.id === itemId);

      if (!item)
        return interaction.reply({ content: 'Item introuvable.', ephemeral: true });
      if (user.coins < item.prix)
        return interaction.reply({ content: `Il te faut **${item.prix.toLocaleString()} VTX-Coins**. Tu en as **${user.coins.toLocaleString()}**.`, ephemeral: true });

      user.coins -= item.prix;

      if (item.id === 'item_shield') {
        const base       = user.shieldActif && user.shieldActif > now ? user.shieldActif : now;
        user.shieldActif = base + item.duree;
        saveDB(db);
        return interaction.reply({ content: `**Bouclier Anti-Rob** active ! Protege jusqu'a <t:${Math.floor(user.shieldActif / 1000)}:R>.`, ephemeral: true });
      }

      if (item.id === 'item_purge') {
        if (!user.malusActif || user.malusActif.expireAt <= now) {
          user.coins += item.prix;
          saveDB(db);
          return interaction.reply({ content: 'Tu n\'as aucun malus actif ! Tu n\'as pas ete debite.', ephemeral: true });
        }
        user.malusActif = null;
        saveDB(db);
        return interaction.reply({ content: 'Malus supprime grace a la **Purge Malus** !', ephemeral: true });
      }

      if (item.id === 'item_vol2x') {
        user.lameProchaineRob = true;
        saveDB(db);
        return interaction.reply({ content: '**Lame Aceree** activee ! Ton prochain `?rob` volera le double du montant.', ephemeral: true });
      }

      saveDB(db);
      return interaction.reply({ content: `**${item.nom}** achete !`, ephemeral: true });
    });
  });

  // ========== COMMANDE ?purge ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.toLowerCase() !== '?purge') return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    await withUserLock(message.author.id, async () => {
      const db   = getDB();
      const user = getUser(db, message.author.id);
      const now  = Date.now();

      if (!user.malusActif || user.malusActif.expireAt <= now)
        return message.reply('Tu n\'as aucun malus actif en ce moment !');
      if (user.coins < PURGE_PRIX)
        return message.reply(`Il te faut **${PURGE_PRIX.toLocaleString()} VTX-Coins** pour purger. Tu en as **${user.coins.toLocaleString()}**.`);

      user.coins     -= PURGE_PRIX;
      user.malusActif = null;
      saveDB(db);
      await message.reply(`Malus supprime ! **-${PURGE_PRIX.toLocaleString()} VTX-Coins**`);
    });
  });

  // ========== COMMANDE ?use ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.toLowerCase() !== '?use') return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    const db   = getDB();
    const user = getUser(db, message.author.id);
    const now  = Date.now();

    if (user.inventaire.length === 0) {
      return message.reply({ embeds: [
        new EmbedBuilder()
          .setTitle('Inventaire vide')
          .setColor(0x36393f)
          .setDescription('Tu n\'as aucun item dans ton inventaire. Achetes-en un avec **?boutique** ou **?items** !')
          .setTimestamp()
      ]});
    }

    const boostActifInfo = user.boostActif && user.boostActif.expireAt > now
      ? `Boost actif : **+${Math.round(user.boostActif.bonus * 100)}% XP** - expire <t:${Math.floor(user.boostActif.expireAt / 1000)}:R>`
      : 'Aucun boost actif';
    const malusInfo = user.malusActif && user.malusActif.expireAt > now
      ? `\nMalus : **${Math.round(user.malusActif.bonus * 100)}% XP** - expire <t:${Math.floor(user.malusActif.expireAt / 1000)}:R> - utilise **?purge**`
      : '';
    const boostPermInfo = user.boostPermanent
      ? `\nBoost permanent equipe : **${BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent)?.nom || user.boostPermanent}**`
      : '';

    const embed = new EmbedBuilder()
      .setTitle(`Inventaire de ${message.author.username}`)
      .setColor(0x5865f2)
      .setDescription(`${boostActifInfo}${malusInfo}${boostPermInfo}\n\nClique sur un item pour l'activer :`)
      .setTimestamp();

    const buttons = user.inventaire.slice(0, 25).map((item, index) =>
      new ButtonBuilder()
        .setCustomId(`use_item_${index}`)
        .setLabel(item.nom.length > 80 ? item.nom.slice(0, 77) + '...' : item.nom)
        .setStyle(item.type === 'boostPermanent' ? ButtonStyle.Primary : ButtonStyle.Success)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5)
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

    await message.reply({ embeds: [embed], components: rows });
  });

  // ========== BOUTONS ?use ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('use_item_')) return;

    const index = parseInt(interaction.customId.replace('use_item_', ''));

    await withUserLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);
      const now  = Date.now();

      if (!user.inventaire[index])
        return interaction.reply({ content: 'Item introuvable dans ton inventaire.', ephemeral: true });

      const item = user.inventaire[index];

      if (item.type === 'boostPermanent') {
        const ancienBoost  = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);
        const nouveauBoost = BOOSTS_PERMANENTS.find(b => b.id === item.boostPermId);
        if (!nouveauBoost)
          return interaction.reply({ content: 'Boost introuvable.', ephemeral: true });

        const membre = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

        if (ancienBoost && membre) {
          await membre.roles.remove(ancienBoost.roleId).catch(() => null);
          user.inventaire.push({
            type:        'boostPermanent',
            boostPermId: ancienBoost.id,
            nom:         ancienBoost.nom + ' (permanent)',
            bonus:       ancienBoost.bonus,
            roleId:      ancienBoost.roleId,
          });
        }

        user.boostPermanent = nouveauBoost.id;
        user.inventaire.splice(index, 1);
        if (membre) await membre.roles.add(nouveauBoost.roleId).catch(() => null);
        saveDB(db);
        return interaction.reply({
          content: `**${nouveauBoost.nom}** reequipe ! (+${Math.round(nouveauBoost.bonus * 100)}% XP permanent)`,
          ephemeral: true,
        });
      }

      if (item.type === 'boost' || !item.type) {
        if (user.boostActif && user.boostActif.expireAt > now)
          return interaction.reply({ content: 'Tu as deja un boost actif ! Attends qu\'il expire.', ephemeral: true });
        user.boostActif = { bonus: item.bonus, expireAt: now + item.duree };
        user.inventaire.splice(index, 1);
        saveDB(db);
        return interaction.reply({ content: `Boost **${item.nom}** active ! Il expire <t:${Math.floor((now + item.duree) / 1000)}:R>`, ephemeral: true });
      }

      return interaction.reply({ content: 'Type d\'item non reconnu.', ephemeral: true });
    });
  });

  // ========== COMMANDE ?profil ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.toLowerCase().startsWith('?profil')) return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    const target = message.mentions.users.first() || message.author;

    await withUserLock(target.id, async () => {
      const db   = getDB();
      const user = getUser(db, target.id);
      const now  = Date.now();

      if (target.id === message.author.id) {
        avancerQuete(user, 'spe_profil', 1, message.guild, message.author.id);
        saveDB(db);
      }

      const rang        = getRang(user.niveau);
      const streakBonus = getStreakBonus(user.streak);
      const xpMax       = xpPourNiveau(user.niveau);
      const xpPct       = Math.min(user.xp / xpMax, 1);
      const membre      = await message.guild.members.fetch(target.id).catch(() => null);

      const getStatusColor = (presence) => {
        if (!presence) return '#747f8d';
        switch (presence.status) {
          case 'online': return '#43b581';
          case 'idle':   return '#faa61a';
          case 'dnd':    return '#f04747';
          default:       return '#747f8d';
        }
      };
      const statusColor = getStatusColor(membre?.presence);

      const W = 900, H = 320;
      const canvas = createCanvas(W, H);
      const ctx    = canvas.getContext('2d');

      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0,   '#0d0d14');
      bgGrad.addColorStop(0.5, '#111120');
      bgGrad.addColorStop(1,   '#0a0a10');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, 20);
      ctx.fill();

      const glow1 = ctx.createRadialGradient(200, 20, 0, 200, 20, 300);
      glow1.addColorStop(0, 'rgba(255, 200, 50, 0.13)');
      glow1.addColorStop(1, 'transparent');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, W, H);

      const glow2 = ctx.createRadialGradient(W - 50, H, 0, W - 50, H, 320);
      glow2.addColorStop(0, 'rgba(130, 80, 255, 0.11)');
      glow2.addColorStop(1, 'transparent');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, 20);
      const borderGrad = ctx.createLinearGradient(0, 0, W, H);
      borderGrad.addColorStop(0,   'rgba(255, 200, 50, 0.5)');
      borderGrad.addColorStop(0.4, 'rgba(130, 80, 255, 0.3)');
      borderGrad.addColorStop(1,   'rgba(255, 200, 50, 0.2)');
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 1;
      for (let i = -H; i < W + H; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + H, H);
        ctx.stroke();
      }
      ctx.restore();

      const AVATAR_X = 90;
      const AVATAR_Y = H / 2;
      const AVATAR_R = 68;

      const halo = ctx.createRadialGradient(AVATAR_X, AVATAR_Y, AVATAR_R - 10, AVATAR_X, AVATAR_Y, AVATAR_R + 35);
      halo.addColorStop(0, 'rgba(255, 200, 50, 0.20)');
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R + 35, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R + 6, 0, Math.PI * 2);
      ctx.strokeStyle = statusColor;
      ctx.lineWidth   = 4;
      ctx.shadowColor = statusColor;
      ctx.shadowBlur  = 12;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R, 0, Math.PI * 2);
      ctx.clip();
      try {
        const avatarURL = target.displayAvatarURL({ extension: 'png', size: 256 });
        const avatarImg = await loadImage(avatarURL);
        ctx.drawImage(avatarImg, AVATAR_X - AVATAR_R, AVATAR_Y - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
      } catch {
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
      }
      ctx.restore();

      const badgeX = AVATAR_X + AVATAR_R - 2;
      const badgeY = AVATAR_Y + AVATAR_R - 2;
      const badgeR = 20;
      ctx.save();
      const badgeGrad = ctx.createLinearGradient(badgeX - badgeR, badgeY - badgeR, badgeX + badgeR, badgeY + badgeR);
      badgeGrad.addColorStop(0, '#ffd700');
      badgeGrad.addColorStop(1, '#ff9d00');
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fillStyle   = badgeGrad;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = '#0d0d14';
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      ctx.font         = 'bold 13px Arial';
      ctx.fillStyle    = '#000';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(user.niveau > 999 ? '999+' : String(user.niveau), badgeX, badgeY + 1);
      ctx.restore();

      const TX = AVATAR_X + AVATAR_R + 40;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';

      const pseudo = membre?.displayName || target.username;
      ctx.font      = 'bold 30px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(pseudo.length > 20 ? pseudo.slice(0, 19) + '...' : pseudo, TX, 76);

      ctx.font      = '13px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillText(`@${target.username}`, TX, 97);

      if (rang) {
        ctx.font      = 'bold 12px Arial';
        const rangW   = ctx.measureText(rang.nom).width + 24;
        const pillGrad = ctx.createLinearGradient(TX, 110, TX + rangW, 136);
        pillGrad.addColorStop(0, 'rgba(255,200,50,0.18)');
        pillGrad.addColorStop(1, 'rgba(130,80,255,0.18)');
        ctx.fillStyle = pillGrad;
        ctx.beginPath();
        ctx.roundRect(TX, 110, rangW, 24, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,200,50,0.4)';
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.fillStyle    = '#ffd700';
        ctx.textBaseline = 'middle';
        ctx.fillText(rang.nom, TX + 12, 122);
        ctx.textBaseline = 'alphabetic';
      }

      const BAR_X = TX, BAR_Y = 158, BAR_W = W - TX - 36, BAR_H = 13;

      ctx.font         = '12px Arial';
      ctx.fillStyle    = 'rgba(255,255,255,0.45)';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('XP', BAR_X, BAR_Y - 7);
      ctx.textAlign = 'right';
      ctx.fillText(`${user.xp.toLocaleString()} / ${xpMax.toLocaleString()}`, BAR_X + BAR_W, BAR_Y - 7);

      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.roundRect(BAR_X, BAR_Y, BAR_W, BAR_H, BAR_H / 2);
      ctx.fill();

      if (xpPct > 0) {
        const fillW   = Math.max(BAR_H, BAR_W * xpPct);
        const barFill = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W, 0);
        barFill.addColorStop(0,   '#ffd700');
        barFill.addColorStop(0.5, '#ff9d00');
        barFill.addColorStop(1,   '#a855f7');
        ctx.save();
        ctx.shadowColor = '#ffd70066';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = barFill;
        ctx.beginPath();
        ctx.roundRect(BAR_X, BAR_Y, fillW, BAR_H, BAR_H / 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.roundRect(BAR_X, BAR_Y, fillW, BAR_H / 2, BAR_H / 2);
        ctx.fill();
      }

      ctx.font         = 'bold 11px Arial';
      ctx.fillStyle    = '#ffd700';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${Math.round(xpPct * 100)}%`, BAR_X, BAR_Y + BAR_H + 15);

      const robDispo        = !user.dernierRob || now - user.dernierRob >= ROB_COOLDOWN_MS;
      const boostPermActuel = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);

      const STATS = [
        { label: 'Coins',     value: user.coins >= 1000000 ? (user.coins / 1000000).toFixed(1) + 'M' : user.coins >= 1000 ? (user.coins / 1000).toFixed(0) + 'k' : String(user.coins) },
        { label: 'Streak',    value: `${user.streak}j +${Math.round(streakBonus * 100)}%` },
        { label: 'Boost',     value: user.boostActif?.expireAt > now ? `+${Math.round(user.boostActif.bonus * 100)}%` : 'Aucun' },
        { label: 'Permanent', value: boostPermActuel ? `+${Math.round(boostPermActuel.bonus * 100)}%` : 'Aucun' },
        { label: 'Rob',       value: robDispo ? 'Dispo' : 'Cooldown', color: robDispo ? '#43b581' : '#f04747' },
      ];

      const STAT_START = TX;
      const STAT_Y     = 205;
      const STAT_W     = (W - STAT_START - 36) / STATS.length;

      STATS.forEach((s, i) => {
        const sx = STAT_START + i * STAT_W;
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.beginPath();
        ctx.roundRect(sx, STAT_Y, STAT_W - 8, 90, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth   = 1;
        ctx.stroke();

        ctx.font         = '11px Arial';
        ctx.fillStyle    = 'rgba(255,255,255,0.38)';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(s.label, sx + 10, STAT_Y + 20);

        ctx.font      = 'bold 15px Arial';
        ctx.fillStyle = s.color || '#ffffff';
        const val     = s.value.length > 10 ? s.value.slice(0, 9) + '...' : s.value;
        ctx.fillText(val, sx + 10, STAT_Y + 44);
      });

      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profil.png' });
      await message.reply({ files: [attachment] });
    });
  });

  // ========== COMMANDE ?aide ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.toLowerCase() !== '?aide') return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    const embed = new EmbedBuilder()
      .setTitle('Commandes du systeme de niveaux')
      .setColor(0x5865f2)
      .addFields(
        { name: 'Progression', value: '`?profil` - Ton profil complet\n`?profil @membre` - Profil d\'un membre\n`?top` - Classement Top 10 XP\n`?topmoney` - Classement Top 10 Coins' },
        { name: 'Quetes',      value: '`?quetes` - Tes quetes du jour en image (reset a minuit, tirage unique par joueur)' },
        { name: 'Boutiques',   value: '`?boutique` - Boosts XP + boite surprise\n`?items` - Bouclier, purge, lame aceree\n`/boutique-boost` - Boutique boosts slash\n`/boutique-roles` - Boosts XP permanents\n`?use` - Activer un item depuis ton inventaire' },
        { name: 'Rob',         value: '`?rob @membre` - Voler entre 5% et 15% des coins (max 75%, cooldown 4h)\n30% de chances d\'echouer -> tu perds **' + ROB_PENALITE.toLocaleString() + ' coins**' },
        { name: 'Malus',       value: '`?purge` - Supprimer ton malus actif (' + PURGE_PRIX.toLocaleString() + ' VTX-Coins)' },
        { name: 'Divertissement', value: '`?iq` - Teste ton QI du jour (reset a minuit)\n`?meteo <ville>` - Affiche la meteo d\'une ville' },
        { name: 'Infos', value: `Tu gagnes **${XP_PAR_MESSAGE} XP** et **${COINS_PAR_MESSAGE} VTX-Coins** par message (1 fois/45 secondes max).\nTu gagnes **${XP_VOCAL_PAR_MINUTE} XP/min** en vocal (2+ personnes, sans mute).\nTon streak augmente ton XP jusqu'a +20% !` },
      )
      .setFooter({ text: 'Team Vortax 2024 - 2026', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  });

  // ========== COMMANDE /adminexpajouter ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'adminexpajouter') return;

    const cible = interaction.options.getUser('membre');
    const somme = interaction.options.getInteger('somme');

    await withUserLock(cible.id, async () => {
      const db   = getDB();
      const user = getUser(db, cible.id);
      user.xp   += somme;

      const ancienNiveau = user.niveau;
      const membre       = await interaction.guild.members.fetch(cible.id).catch(() => null);
      await gererNiveauEtRang(user, ancienNiveau, interaction.guild, membre, cible.id);
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('XP ajoutee [ADMIN]')
        .setColor(0xe67e22)
        .setDescription(
          `**+${somme.toLocaleString()} XP** ajoutes a <@${cible.id}>\n\n` +
          `Niveau : **${user.niveau}**\n` +
          `XP actuelle : **${user.xp}** / **${xpPourNiveau(user.niveau)}**`
        )
        .setFooter({ text: `Action effectuee par ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    });
  });

  // ========== COMMANDE /adminmoneyajouter ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'adminmoneyajouter') return;

    const cible = interaction.options.getUser('membre');
    const somme = interaction.options.getInteger('somme');

    await withUserLock(cible.id, async () => {
      const db   = getDB();
      const user = getUser(db, cible.id);
      user.coins += somme;
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('VTX-Coins ajoutes [ADMIN]')
        .setColor(0xe67e22)
        .setDescription(
          `**+${somme.toLocaleString()} VTX-Coins** ajoutes a <@${cible.id}>\n\n` +
          `Solde actuel : **${user.coins.toLocaleString()} VTX-Coins**`
        )
        .setFooter({ text: `Action effectuee par ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    });
  });

  // ========== COMMANDE /boutique-boost ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'boutique-boost') return;

    const db   = getDB();
    const user = getUser(db, interaction.user.id);

    const labelBoost = (b) => {
      const bonus    = `+${Math.round(b.bonus * 100)}%`;
      const dureeMin = b.duree / 60000;
      const duree    = dureeMin >= 60 ? `${dureeMin / 60}h` : `${dureeMin}min`;
      const prix     = b.prix >= 1000 ? `${b.prix / 1000}k` : b.prix;
      return `${bonus} - ${duree} - ${prix}`;
    };

    const boostButtons = BOOSTS.map(b =>
      new ButtonBuilder()
        .setCustomId(`boutique_boost_${b.id}`)
        .setLabel(labelBoost(b))
        .setStyle(ButtonStyle.Primary)
    );
    boostButtons.push(
      new ButtonBuilder()
        .setCustomId('boutique_boost_boite')
        .setLabel('Boite - 50k')
        .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    for (let i = 0; i < boostButtons.length; i += 5)
      rows.push(new ActionRowBuilder().addComponents(boostButtons.slice(i, i + 5)));

    const embed = new EmbedBuilder()
      .setTitle('Boutique Boosts VTX')
      .setColor(0xffd700)
      .setDescription(
        `Ton solde : **${user.coins.toLocaleString()} VTX-Coins**\n` +
        `> Tu peux aussi acheter des items avec **?items**`
      )
      .addFields(
        { name: 'Boosts XP disponibles', value: BOOSTS.map(b => `**${b.nom}** - ${b.prix.toLocaleString()} VTX-Coins`).join('\n') },
        { name: 'Boite Surprise',        value: `**50 000 VTX-Coins** - Gain ou malus aleatoire !\nUtilise **?purge** (${PURGE_PRIX.toLocaleString()} coins) pour retirer un malus.` },
      )
      .setFooter({ text: 'Team Vortax 2024 - 2026', iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
  });

  // ========== COMMANDE /boutique-roles ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'boutique-roles') return;

    const db   = getDB();
    const user = getUser(db, interaction.user.id);

    const buttons = BOOSTS_PERMANENTS.map(b =>
      new ButtonBuilder()
        .setCustomId(`perm_achat_${b.id}`)
        .setLabel(`${b.nom} - ${(b.prix / 1000000).toFixed(0)}M coins`)
        .setStyle(ButtonStyle.Primary)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5)
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

    const boostActuel = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);

    const embed = new EmbedBuilder()
      .setTitle('Boutique Boosts Permanents VTX')
      .setColor(0x5865f2)
      .setDescription(
        `Ton solde : **${user.coins.toLocaleString()} VTX-Coins**\n` +
        `Boost actuel : **${boostActuel ? boostActuel.nom + ` (+${Math.round(boostActuel.bonus * 100)}%)` : 'Aucun'}**`
      )
      .addFields({
        name: 'Boosts disponibles',
        value: BOOSTS_PERMANENTS.map(b =>
          `**${b.nom}** — +${Math.round(b.bonus * 100)}% XP permanent — ${b.prix.toLocaleString()} coins`
        ).join('\n'),
      })
      .setFooter({ text: 'Team Vortax 2024 - 2026', iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
  });

  // ========== BOUTONS /boutique-roles ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('perm_achat_')) return;

    const permId = interaction.customId.replace('perm_achat_', '');
    const boost  = BOOSTS_PERMANENTS.find(b => b.id === permId);
    if (!boost) return interaction.reply({ content: 'Boost introuvable.', ephemeral: true });

    await withUserLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);

      if (user.boostPermanent === boost.id)
        return interaction.reply({ content: `Tu as deja le **${boost.nom}** equipe !`, ephemeral: true });

      if (user.coins < boost.prix)
        return interaction.reply({ content: `Il te faut **${boost.prix.toLocaleString()} coins**. Tu en as **${user.coins.toLocaleString()}**.`, ephemeral: true });

      const ancienBoost = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);
      if (ancienBoost) {
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`perm_confirm_${boost.id}`)
            .setLabel('Confirmer')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('perm_annuler')
            .setLabel('Annuler')
            .setStyle(ButtonStyle.Secondary),
        );

        return interaction.reply({
          content:
            `Tu as deja le **${ancienBoost.nom}** (+${Math.round(ancienBoost.bonus * 100)}% XP) equipe.\n` +
            `En achetant **${boost.nom}** (+${Math.round(boost.bonus * 100)}% XP) pour **${boost.prix.toLocaleString()} coins**, l\'ancien sera range dans ton inventaire.\n` +
            `Tu pourras le reequiper avec **?use** a tout moment.`,
          components: [confirmRow],
          ephemeral: true,
        });
      }

      await appliquerBoostPermanent(interaction, db, user, boost);
      saveDB(db);
    });
  });

  // ========== BOUTON CONFIRMATION ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'perm_annuler')
      return interaction.update({ content: 'Achat annule.', components: [] });

    if (!interaction.customId.startsWith('perm_confirm_')) return;

    const permId = interaction.customId.replace('perm_confirm_', '');
    const boost  = BOOSTS_PERMANENTS.find(b => b.id === permId);
    if (!boost) return interaction.update({ content: 'Boost introuvable.', components: [] });

    await withUserLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);

      if (user.coins < boost.prix)
        return interaction.update({ content: `Plus assez de coins ! Il te faut **${boost.prix.toLocaleString()}** coins.`, components: [] });

      await appliquerBoostPermanent(interaction, db, user, boost, true);
      saveDB(db);
    });
  });

  // ========== HELPER BOOST PERMANENT ==========
  const appliquerBoostPermanent = async (interaction, db, user, boost, estRemplacement = false) => {
    const membre = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (estRemplacement && user.boostPermanent) {
      const ancienBoost = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);
      if (ancienBoost) {
        if (membre) await membre.roles.remove(ancienBoost.roleId).catch(() => null);
        user.inventaire.push({
          type:        'boostPermanent',
          boostPermId: ancienBoost.id,
          nom:         ancienBoost.nom + ' (permanent)',
          bonus:       ancienBoost.bonus,
          roleId:      ancienBoost.roleId,
        });
      }
    }

    user.coins         -= boost.prix;
    user.boostPermanent = boost.id;
    if (membre) await membre.roles.add(boost.roleId).catch(() => null);

    const msg = estRemplacement
      ? `**${boost.nom}** equipe ! (+${Math.round(boost.bonus * 100)}% XP permanent)\nL\'ancien boost a ete range dans ton inventaire - utilise **?use** pour le reequiper.\nSolde restant : **${user.coins.toLocaleString()} coins**`
      : `**${boost.nom}** achete ! Tu beneficies maintenant de **+${Math.round(boost.bonus * 100)}% XP permanent** !\nSolde restant : **${user.coins.toLocaleString()} coins**`;

    if (estRemplacement) {
      await interaction.update({ content: msg, components: [] });
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  };

  // ========== COMMANDE ?rob ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.toLowerCase().startsWith('?rob')) return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    const EXEMPTS = [
      '1405637417272086588', // Vortax
    ];

    const cible = message.mentions.users.first();
    if (!cible)                         return message.reply('Mentionne quelqu\'un a voler ! Ex : `?rob @pseudo`');
    if (cible.id === message.author.id) return message.reply('Tu ne peux pas te voler toi-meme.');
    if (cible.bot)                      return message.reply('Tu ne peux pas voler un bot.');

    const lockKey = [message.author.id, cible.id].sort().join('_');
    await withUserLock(lockKey, async () => {
      const db      = getDB();
      const voleur  = getUser(db, message.author.id);
      const victime = getUser(db, cible.id);
      const now     = Date.now();

      const membreVoleur   = await message.guild.members.fetch(message.author.id).catch(() => null);
      const voleurEstAdmin = membreVoleur?.roles.cache.some(r => ADMINS_ROLES.includes(r.id));
      const voleurExempt   = EXEMPTS.includes(message.author.id) || voleurEstAdmin;

      const membreCible    = await message.guild.members.fetch(cible.id).catch(() => null);
      const cibleEstAdmin  = membreCible?.roles.cache.some(r => ADMINS_ROLES.includes(r.id));
      const cibleEstExempt = EXEMPTS.includes(cible.id) || cibleEstAdmin;

      if (cibleEstExempt && !voleurExempt)
        return message.reply(`<@${cible.id}> ne peut pas être volé. 🛡️`);

      if (!voleurExempt && voleur.dernierRob && now - voleur.dernierRob < ROB_COOLDOWN_MS) {
        const resteMs = ROB_COOLDOWN_MS - (now - voleur.dernierRob);
        return message.reply(`Tu dois attendre encore <t:${Math.floor((now + resteMs) / 1000)}:R> avant de pouvoir voler a nouveau.`);
      }

      if (victime.coins <= 0)
        return message.reply(`Impossible de voler <@${cible.id}>, il n'a pas un seul VTX-Coin !`);

      if (victime.shieldActif && victime.shieldActif > now) {
        if (!voleurExempt) voleur.dernierRob = now;
        saveDB(db);
        return message.reply(`<@${cible.id}> est protege par un **Bouclier Anti-Rob** ! Tu repars les mains vides${!voleurExempt ? ' et ton cooldown est reinitialise' : ''}.`);
      }

      if (!voleurExempt) voleur.dernierRob = now;

      if (Math.random() < ROB_ECHEC_CHANCE) {
        const perte  = Math.min(ROB_PENALITE, voleur.coins);
        voleur.coins = Math.max(0, voleur.coins - perte);
        saveDB(db);
        return message.reply(
          `Le vol a echoue ! Tu t'es fait attraper et tu as perdu **${perte.toLocaleString()} VTX-Coins**.\n` +
          `Ton solde : **${voleur.coins.toLocaleString()} VTX-Coins**`
        );
      }

      const pct   = 0.05 + Math.random() * 0.10;
      let montant = Math.floor(victime.coins * pct);
      montant     = Math.min(montant, Math.floor(victime.coins * 0.75));
      montant     = Math.min(montant, 500000);

      if (voleur.lameProchaineRob) {
        montant = Math.min(montant * 2, Math.floor(victime.coins * 0.75));
        voleur.lameProchaineRob = false;
      }

      victime.coins -= montant;
      voleur.coins  += montant;
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('Vol reussi !')
        .setColor(0xe74c3c)
        .setDescription(
          `<@${message.author.id}> a vole **${montant.toLocaleString()} VTX-Coins** a <@${cible.id}> !\n\n` +
          `Ton solde : **${voleur.coins.toLocaleString()}**\n` +
          `Solde de <@${cible.id}> : **${victime.coins.toLocaleString()}**`
        )
        .setFooter({ text: voleurExempt ? 'Aucun cooldown appliqué' : 'Prochain rob disponible dans 4h' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    });
  });

  // ========== COMMANDE /adminexpremove ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'adminexpremove') return;

    const cible = interaction.options.getUser('membre');
    const somme = interaction.options.getInteger('somme');

    await withUserLock(cible.id, async () => {
      const db   = getDB();
      const user = getUser(db, cible.id);
      user.xp    = Math.max(0, (user.xp || 0) - somme);

      const ancienNiveau = user.niveau;
      const membre       = await interaction.guild.members.fetch(cible.id).catch(() => null);
      await gererNiveauEtRang(user, ancienNiveau, interaction.guild, membre, cible.id);
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('XP retiree [ADMIN]')
        .setColor(0xe74c3c)
        .setDescription(
          `**-${somme.toLocaleString()} XP** retires a <@${cible.id}>\n\n` +
          `Niveau : **${user.niveau}**\n` +
          `XP actuelle : **${user.xp}** / **${xpPourNiveau(user.niveau)}**`
        )
        .setFooter({ text: `Action effectuee par ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    });
  });

  // ========== COMMANDE /adminmoneyremove ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'adminmoneyremove') return;

    const cible = interaction.options.getUser('membre');
    const somme = interaction.options.getInteger('somme');

    await withUserLock(cible.id, async () => {
      const db   = getDB();
      const user = getUser(db, cible.id);
      user.coins = Math.max(0, (user.coins || 0) - somme);
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('VTX-Coins retires [ADMIN]')
        .setColor(0xe74c3c)
        .setDescription(
          `**-${somme.toLocaleString()} VTX-Coins** retires a <@${cible.id}>\n\n` +
          `Solde actuel : **${user.coins.toLocaleString()} VTX-Coins**`
        )
        .setFooter({ text: `Action effectuee par ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    });
  });

  // ========== COMMANDE ?donner ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.toLowerCase().startsWith('?donner')) return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    const args    = message.content.split(/\s+/);
    const cible   = message.mentions.users.first();
    const montant = parseInt(args[2]);

    if (!cible)
      return message.reply('Mentionne quelqu\'un ! Ex : `?donner @pseudo 500`');
    if (cible.id === message.author.id)
      return message.reply('Tu ne peux pas te donner des coins à toi-même.');
    if (cible.bot)
      return message.reply('Tu ne peux pas donner des coins à un bot.');
    if (!montant || montant <= 0 || isNaN(montant))
      return message.reply('Indique un montant valide ! Ex : `?donner @pseudo 500`');

    const lockKey = [message.author.id, cible.id].sort().join('_');
    await withUserLock(lockKey, async () => {
      const db       = getDB();
      const donneur  = getUser(db, message.author.id);
      const receveur = getUser(db, cible.id);

      if (donneur.coins < montant)
        return message.reply(`Tu n'as pas assez de coins ! Ton solde : **${donneur.coins.toLocaleString()} VTX-Coins**`);

      donneur.coins  -= montant;
      receveur.coins += montant;
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('Don effectué !')
        .setColor(0x2ecc71)
        .setDescription(
          `<@${message.author.id}> a donné **${montant.toLocaleString()} VTX-Coins** à <@${cible.id}> !\n\n` +
          `Ton solde : **${donneur.coins.toLocaleString()} VTX-Coins**\n` +
          `Solde de <@${cible.id}> : **${receveur.coins.toLocaleString()} VTX-Coins**`
        )
        .setFooter({ text: 'Team Vortax 2024 - 2026', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    });
  });

}; // ← fin du module.exports