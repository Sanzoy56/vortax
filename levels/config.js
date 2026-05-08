'use strict';

const SALONS = {
  niveaux:   '1500132108599955647',
  rangs:     '1500132032016285797',
  streaks:   '1500132131173564586',
  annonces:  '1360971107846590474',
  quetes:    '1500132151381852394',
};

const ADMINS_ROLES = [
  '1473460100210360370',
  '1491458130322919435',
  '1361408552664568100',
];

const XP_PAR_MESSAGE      = 120;
const XP_VOCAL_PAR_MINUTE = 60;
const COINS_PAR_MESSAGE   = 115;
const MESSAGE_COOLDOWN_MS = 45 * 1000;
const PURGE_PRIX          = 30000;
const ROB_COOLDOWN_MS     = 4 * 60 * 60 * 1000;
const ROB_ECHEC_CHANCE    = 0.30;
const ROB_PENALITE        = 20000;
const BOITE_PRIX          = 50000;
const TROIS_MOIS_MS       = 3 * 30 * 24 * 60 * 60 * 1000;
const VORTAX_ID           = '1405637417272086588';

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
  { id: 'item_shield', nom: 'Bouclier Anti-Rob', desc: 'Protège contre un vol pendant 2h',        prix: 40000, duree: 2 * 60 * 60 * 1000 },
  { id: 'item_purge',  nom: 'Purge Malus',        desc: 'Supprime immédiatement ton malus actif',  prix: 25000, duree: null                },
  { id: 'item_vol2x',  nom: 'Lame Acérée',        desc: 'Double le montant volé au prochain /rob', prix: 60000, duree: null                },
];

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
  { id: 'msg_5',         nom: 'Bavard',           desc: 'Envoyer 5 messages',                        cat: 'Messages',    cible: 5,     xp: 100,  coins: 400  },
  { id: 'msg_10',        nom: 'Causant',          desc: 'Envoyer 10 messages',                       cat: 'Messages',    cible: 10,    xp: 150,  coins: 600  },
  { id: 'msg_30',        nom: 'Intarissable',     desc: 'Envoyer 30 messages',                       cat: 'Messages',    cible: 30,    xp: 400,  coins: 1500 },
  { id: 'msg_75',        nom: 'Machine à écrire', desc: 'Envoyer 75 messages',                       cat: 'Messages',    cible: 75,    xp: 900,  coins: 3500 },
  { id: 'msg_reply',     nom: 'Réactif',          desc: 'Répondre à 5 messages',                     cat: 'Messages',    cible: 5,     xp: 120,  coins: 450  },
  { id: 'voc_10',        nom: 'Présent',          desc: 'Rester 10 min en vocal',                    cat: 'Vocal',       cible: 10,    xp: 150,  coins: 600  },
  { id: 'voc_30',        nom: 'Sociable',         desc: 'Rester 30 min en vocal',                    cat: 'Vocal',       cible: 30,    xp: 450,  coins: 1800 },
  { id: 'voc_90',        nom: 'Accro au micro',   desc: 'Rester 1h30 en vocal',                      cat: 'Vocal',       cible: 90,    xp: 1000, coins: 4000 },
  { id: 'voc_group',     nom: 'Animateur',        desc: 'Être dans un vocal 3+ personnes pendant 1h',cat: 'Vocal',       cible: 60,    xp: 1200, coins: 5000 },
  { id: 'soc_react10',   nom: 'Expressif',        desc: 'Mettre 10 réactions',                       cat: 'Social',      cible: 10,    xp: 300,  coins: 1200 },
  { id: 'soc_repVortax', nom: 'Répondre à Vortax',desc: 'Répondre directement à Vortax',             cat: 'Social',      cible: 1,     xp: 1200, coins: 5000 },
  { id: 'prog_boost',    nom: 'Boosté',           desc: 'Activer un boost',                          cat: 'Progression', cible: 1,     xp: 300,  coins: 1200 },
  { id: 'prog_xp500',    nom: 'Accumulateur',     desc: "Gagner 500 XP aujourd'hui",                 cat: 'Progression', cible: 500,   xp: 400,  coins: 1500 },
  { id: 'prog_xp2000',   nom: 'XP addict',        desc: "Gagner 2000 XP aujourd'hui",                cat: 'Progression', cible: 2000,  xp: 1000, coins: 4000 },
  { id: 'prog_streak',   nom: 'Fidèle',           desc: "Maintenir son streak aujourd'hui",          cat: 'Progression', cible: 1,     xp: 250,  coins: 1000 },
  { id: 'prog_coins',    nom: 'Économe',          desc: "Gagner 10 000 coins aujourd'hui",           cat: 'Progression', cible: 10000, xp: 800,  coins: 0    },
  { id: 'evt_matin',     nom: 'Matinal',          desc: 'Envoyer un message avant 9h',               cat: 'Evenement',   cible: 1,     xp: 100,  coins: 400  },
  { id: 'evt_nuit',      nom: 'Noctambule',       desc: 'Envoyer un message après minuit',           cat: 'Evenement',   cible: 1,     xp: 100,  coins: 400  },
  { id: 'evt_vendredi',  nom: 'Vendredi soir',    desc: 'Envoyer 10 messages un vendredi après 20h', cat: 'Evenement',   cible: 10,    xp: 350,  coins: 1400 },
  { id: 'evt_weekend',   nom: 'Actif du weekend', desc: 'Envoyer 20 messages un samedi ou dimanche', cat: 'Evenement',   cible: 20,    xp: 400,  coins: 1600 },
  { id: 'spe_profil',    nom: 'Curieux',          desc: 'Utiliser la commande /profil',              cat: 'Speciale',    cible: 1,     xp: 80,   coins: 300  },
  { id: 'spe_boutique',  nom: 'Commerçant',       desc: 'Ouvrir la boutique',                        cat: 'Speciale',    cible: 1,     xp: 80,   coins: 300  },
  { id: 'spe_combo',     nom: 'Combo',            desc: 'Envoyer 30 msgs ET rester 45 min en vocal', cat: 'Speciale',    cible: 1,     xp: 1500, coins: 6000 },
];

const REPARTITION_QUETES = {
  Messages: 2, Vocal: 2, Social: 2, Progression: 2, Evenement: 1, Speciale: 1,
};

module.exports = {
  SALONS, ADMINS_ROLES, VORTAX_ID,
  XP_PAR_MESSAGE, XP_VOCAL_PAR_MINUTE, COINS_PAR_MESSAGE,
  MESSAGE_COOLDOWN_MS, PURGE_PRIX, ROB_COOLDOWN_MS,
  ROB_ECHEC_CHANCE, ROB_PENALITE, BOITE_PRIX, TROIS_MOIS_MS,
  RANGS, BOOSTS_PERMANENTS, STREAKS_BONUS, BOOSTS, ITEMS,
  BOITE_RECOMPENSES, TOUTES_QUETES, REPARTITION_QUETES,
};