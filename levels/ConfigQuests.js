'use strict';

// ─── POOL DE 100 QUÊTES ───────────────────────────────────────
// Catégories : MSG, VOC, SOC, PRG, EVT, SPE
const QUEST_POOL = [

  // ── MSG (messages) ──────────────────────────────────────────
  { id: 'msg_01', cat: 'MSG', label: 'Bavard',             desc: 'Envoyer 10 messages',          type: 'messages',  target: 10,    rewardExp: 150,  rewardCoins: 500   },
  { id: 'msg_02', cat: 'MSG', label: 'Communicant',        desc: 'Envoyer 20 messages',          type: 'messages',  target: 20,    rewardExp: 300,  rewardCoins: 1000  },
  { id: 'msg_03', cat: 'MSG', label: 'Intarissable',       desc: 'Envoyer 50 messages',          type: 'messages',  target: 50,    rewardExp: 700,  rewardCoins: 3000  },
  { id: 'msg_04', cat: 'MSG', label: 'Machine à écrire',   desc: 'Envoyer 100 messages',         type: 'messages',  target: 100,   rewardExp: 1200, rewardCoins: 5000  },
  { id: 'msg_05', cat: 'MSG', label: 'Graphomane',         desc: 'Envoyer 200 messages',         type: 'messages',  target: 200,   rewardExp: 2000, rewardCoins: 8000  },
  { id: 'msg_06', cat: 'MSG', label: 'Prolixe',            desc: 'Envoyer 300 messages',         type: 'messages',  target: 300,   rewardExp: 3000, rewardCoins: 12000 },
  { id: 'msg_07', cat: 'MSG', label: 'Inépuisable',        desc: 'Envoyer 500 messages',         type: 'messages',  target: 500,   rewardExp: 5000, rewardCoins: 20000 },
  { id: 'msg_08', cat: 'MSG', label: 'Premier mot',        desc: 'Envoyer 1 message',            type: 'messages',  target: 1,     rewardExp: 50,   rewardCoins: 200   },
  { id: 'msg_09', cat: 'MSG', label: 'Causant',            desc: 'Envoyer 5 messages',           type: 'messages',  target: 5,     rewardExp: 100,  rewardCoins: 300   },
  { id: 'msg_10', cat: 'MSG', label: 'Encyclopédiste',     desc: 'Envoyer 150 messages',         type: 'messages',  target: 150,   rewardExp: 1600, rewardCoins: 6000  },
  { id: 'msg_11', cat: 'MSG', label: 'Speedrunner',        desc: 'Envoyer 30 messages',          type: 'messages',  target: 30,    rewardExp: 400,  rewardCoins: 1500  },
  { id: 'msg_12', cat: 'MSG', label: 'Logorrhée',          desc: 'Envoyer 75 messages',          type: 'messages',  target: 75,    rewardExp: 900,  rewardCoins: 3500  },
  { id: 'msg_13', cat: 'MSG', label: 'Verbeux',            desc: 'Envoyer 250 messages',         type: 'messages',  target: 250,   rewardExp: 2500, rewardCoins: 10000 },
  { id: 'msg_14', cat: 'MSG', label: 'Sans filtre',        desc: 'Envoyer 400 messages',         type: 'messages',  target: 400,   rewardExp: 4000, rewardCoins: 16000 },
  { id: 'msg_15', cat: 'MSG', label: 'Diarrhée verbale',   desc: 'Envoyer 600 messages',         type: 'messages',  target: 600,   rewardExp: 6000, rewardCoins: 25000 },

  // ── VOC (vocal) ─────────────────────────────────────────────
  { id: 'voc_01', cat: 'VOC', label: 'Présent',            desc: 'Rester 5 min en vocal',        type: 'vocal_min', target: 5,     rewardExp: 100,  rewardCoins: 400   },
  { id: 'voc_02', cat: 'VOC', label: 'Fidèle',             desc: 'Rester 15 min en vocal',       type: 'vocal_min', target: 15,    rewardExp: 300,  rewardCoins: 1200  },
  { id: 'voc_03', cat: 'VOC', label: 'Sédentaire',         desc: 'Rester 30 min en vocal',       type: 'vocal_min', target: 30,    rewardExp: 600,  rewardCoins: 2500  },
  { id: 'voc_04', cat: 'VOC', label: 'Enraciné',           desc: 'Rester 1h en vocal',           type: 'vocal_min', target: 60,    rewardExp: 1000, rewardCoins: 4000  },
  { id: 'voc_05', cat: 'VOC', label: 'Colocataire',        desc: 'Rester 2h en vocal',           type: 'vocal_min', target: 120,   rewardExp: 2000, rewardCoins: 8000  },
  { id: 'voc_06', cat: 'VOC', label: 'Animateur',          desc: 'Être dans un vocal avec 3+ personnes 20 min', type: 'vocal_min', target: 20, rewardExp: 600, rewardCoins: 2500 },
  { id: 'voc_07', cat: 'VOC', label: 'Sociable',           desc: 'Être dans un vocal avec 2+ personnes 10 min', type: 'vocal_min', target: 10, rewardExp: 250, rewardCoins: 1000 },
  { id: 'voc_08', cat: 'VOC', label: 'Noctambule',         desc: 'Rester 45 min en vocal',       type: 'vocal_min', target: 45,    rewardExp: 800,  rewardCoins: 3200  },
  { id: 'voc_09', cat: 'VOC', label: 'Ermite vocal',       desc: 'Rester 90 min en vocal',       type: 'vocal_min', target: 90,    rewardExp: 1500, rewardCoins: 6000  },
  { id: 'voc_10', cat: 'VOC', label: 'Marathonien',        desc: 'Rester 3h en vocal',           type: 'vocal_min', target: 180,   rewardExp: 3000, rewardCoins: 12000 },

  // ── SOC (social/réactions) ──────────────────────────────────
  { id: 'soc_01', cat: 'SOC', label: 'Réactionneur',       desc: 'Mettre 5 réactions',           type: 'reactions', target: 5,     rewardExp: 100,  rewardCoins: 400   },
  { id: 'soc_02', cat: 'SOC', label: 'Expressif',          desc: 'Mettre 10 réactions',          type: 'reactions', target: 10,    rewardExp: 200,  rewardCoins: 800   },
  { id: 'soc_03', cat: 'SOC', label: 'Émotif',             desc: 'Mettre 20 réactions',          type: 'reactions', target: 20,    rewardExp: 400,  rewardCoins: 1600  },
  { id: 'soc_04', cat: 'SOC', label: 'Vibrant',            desc: 'Mettre 30 réactions',          type: 'reactions', target: 30,    rewardExp: 500,  rewardCoins: 2000  },
  { id: 'soc_05', cat: 'SOC', label: 'Hyperactif',         desc: 'Mettre 50 réactions',          type: 'reactions', target: 50,    rewardExp: 800,  rewardCoins: 3000  },
  { id: 'soc_06', cat: 'SOC', label: 'Émoji addict',       desc: 'Mettre 75 réactions',          type: 'reactions', target: 75,    rewardExp: 1200, rewardCoins: 5000  },
  { id: 'soc_07', cat: 'SOC', label: 'Spammeur d\'émojis', desc: 'Mettre 100 réactions',         type: 'reactions', target: 100,   rewardExp: 1500, rewardCoins: 6000  },
  { id: 'soc_08', cat: 'SOC', label: 'Timide',             desc: 'Mettre 1 réaction',            type: 'reactions', target: 1,     rewardExp: 50,   rewardCoins: 200   },
  { id: 'soc_09', cat: 'SOC', label: 'Enthousiaste',       desc: 'Mettre 3 réactions',           type: 'reactions', target: 3,     rewardExp: 80,   rewardCoins: 300   },
  { id: 'soc_10', cat: 'SOC', label: 'Reactor',            desc: 'Mettre 15 réactions',          type: 'reactions', target: 15,    rewardExp: 300,  rewardCoins: 1200  },

  // ── PRG (progression/XP/coins) ──────────────────────────────
  { id: 'prg_01', cat: 'PRG', label: 'Gagne-petit',        desc: 'Gagner 100 XP aujourd\'hui',   type: 'exp',       target: 100,   rewardExp: 0,    rewardCoins: 500   },
  { id: 'prg_02', cat: 'PRG', label: 'En progression',     desc: 'Gagner 300 XP aujourd\'hui',   type: 'exp',       target: 300,   rewardExp: 0,    rewardCoins: 1200  },
  { id: 'prg_03', cat: 'PRG', label: 'XP addict',          desc: 'Gagner 1 500 XP aujourd\'hui', type: 'exp',       target: 1500,  rewardExp: 0,    rewardCoins: 3000  },
  { id: 'prg_04', cat: 'PRG', label: 'Grinder',            desc: 'Gagner 3 000 XP aujourd\'hui', type: 'exp',       target: 3000,  rewardExp: 0,    rewardCoins: 6000  },
  { id: 'prg_05', cat: 'PRG', label: 'Hardcore',           desc: 'Gagner 5 000 XP aujourd\'hui', type: 'exp',       target: 5000,  rewardExp: 0,    rewardCoins: 10000 },
  // CORRIGÉ : type 'coins_earned' pour les coins gagnés (messages), distinct de 'bank'
  { id: 'prg_06', cat: 'PRG', label: 'Riche',              desc: 'Gagner 500 VTX-Coins',         type: 'coins_earned', target: 500,  rewardExp: 200,  rewardCoins: 0  },
  { id: 'prg_07', cat: 'PRG', label: 'Fortuné',            desc: 'Gagner 2 000 VTX-Coins',       type: 'coins_earned', target: 2000, rewardExp: 500,  rewardCoins: 0  },
  { id: 'prg_08', cat: 'PRG', label: 'Millionnaire',       desc: 'Gagner 5 000 VTX-Coins',       type: 'coins_earned', target: 5000, rewardExp: 1000, rewardCoins: 0  },
  { id: 'prg_09', cat: 'PRG', label: 'Boosté',             desc: 'Activer un boost',              type: 'boost',     target: 1,     rewardExp: 200,  rewardCoins: 800   },
  // CORRIGÉ : type 'bank' pour déposer en banque
  { id: 'prg_10', cat: 'PRG', label: 'Investisseur',       desc: 'Déposer de l\'argent en banque',type: 'bank',      target: 1,     rewardExp: 150,  rewardCoins: 600   },
  // CORRIGÉ : type 'bank_amount' pour vérifier le solde en banque
  { id: 'prg_11', cat: 'PRG', label: 'Économe',            desc: 'Avoir 10 000 VTX-Coins en banque', type: 'bank_amount', target: 10000, rewardExp: 800, rewardCoins: 0 },
  { id: 'prg_12', cat: 'PRG', label: 'Casseur de niveaux', desc: 'Monter de niveau',              type: 'levelup',   target: 1,     rewardExp: 0,    rewardCoins: 2000  },
  { id: 'prg_13', cat: 'PRG', label: 'Spendthrift',        desc: 'Dépenser 1 000 VTX-Coins',     type: 'spend',     target: 1000,  rewardExp: 300,  rewardCoins: 0     },
  { id: 'prg_14', cat: 'PRG', label: 'Gros dépensier',     desc: 'Dépenser 5 000 VTX-Coins',     type: 'spend',     target: 5000,  rewardExp: 800,  rewardCoins: 0     },
  { id: 'prg_15', cat: 'PRG', label: 'XP 500',             desc: 'Gagner 500 XP aujourd\'hui',   type: 'exp',       target: 500,   rewardExp: 0,    rewardCoins: 2000  },

  // ── EVT (événements spéciaux) ───────────────────────────────
  { id: 'evt_01', cat: 'EVT', label: 'Matinal',            desc: 'Envoyer un message avant 9h',  type: 'morning',   target: 1,     rewardExp: 200,  rewardCoins: 800   },
  { id: 'evt_02', cat: 'EVT', label: 'Noctambule',         desc: 'Envoyer un message après 23h', type: 'night',     target: 1,     rewardExp: 200,  rewardCoins: 800   },
  { id: 'evt_03', cat: 'EVT', label: 'Ponctuel',           desc: 'Se connecter aujourd\'hui',    type: 'login',     target: 1,     rewardExp: 100,  rewardCoins: 400   },
  { id: 'evt_05', cat: 'EVT', label: 'Flambeur',           desc: 'Utiliser la commande /rob',    type: 'rob',       target: 1,     rewardExp: 300,  rewardCoins: 1000  },
  { id: 'evt_06', cat: 'EVT', label: 'Banquier',           desc: 'Utiliser /dep ou /with',       type: 'bank',      target: 1,     rewardExp: 150,  rewardCoins: 600   },
  { id: 'evt_07', cat: 'EVT', label: 'Visiteur',           desc: 'Utiliser 5 commandes',         type: 'commands',  target: 5,     rewardExp: 200,  rewardCoins: 800   },
  { id: 'evt_08', cat: 'EVT', label: 'Explorateur',        desc: 'Utiliser 10 commandes',        type: 'commands',  target: 10,    rewardExp: 400,  rewardCoins: 1500  },
  { id: 'evt_09', cat: 'EVT', label: 'Curieux',            desc: 'Utiliser 3 commandes',         type: 'commands',  target: 3,     rewardExp: 150,  rewardCoins: 600   },
  // CORRIGÉ : type 'give' au lieu de 'commands' pour ne se déclencher que sur /donner
  { id: 'evt_12', cat: 'EVT', label: 'Généreux',           desc: 'Utiliser /donner',             type: 'give',      target: 1,     rewardExp: 200,  rewardCoins: 800   },
  { id: 'evt_13', cat: 'EVT', label: 'Lève-tôt',           desc: 'Envoyer un message avant 8h',  type: 'morning',   target: 1,     rewardExp: 300,  rewardCoins: 1200  },
  { id: 'evt_14', cat: 'EVT', label: 'Nuit blanche',       desc: 'Envoyer un message après minuit', type: 'night', target: 1,     rewardExp: 300,  rewardCoins: 1200  },
  { id: 'evt_15', cat: 'EVT', label: 'Shopaholic',         desc: 'Acheter quelque chose en boutique', type: 'spend', target: 1,   rewardExp: 250,  rewardCoins: 1000  },

  // ── SPE (spéciales/combo) ───────────────────────────────────
  { id: 'spe_01', cat: 'SPE', label: 'Combo',              desc: 'Envoyer 10 msgs ET rester 30 min en vocal', type: 'combo_msg_voc',    target: 1, rewardExp: 800,  rewardCoins: 3000  },
  { id: 'spe_02', cat: 'SPE', label: 'Polyvalent',         desc: 'Gagner 500 XP et 500 Coins',   type: 'combo_xp_coins',   target: 1, rewardExp: 600,  rewardCoins: 2500  },
  { id: 'spe_03', cat: 'SPE', label: 'Boss du jour',       desc: 'Compléter 5 quêtes en un jour', type: 'quests_done',      target: 5, rewardExp: 2000, rewardCoins: 8000  },
  { id: 'spe_04', cat: 'SPE', label: 'Légende',            desc: 'Compléter 8 quêtes en un jour', type: 'quests_done',      target: 8, rewardExp: 4000, rewardCoins: 15000 },
  { id: 'spe_05', cat: 'SPE', label: 'Social butterfly',   desc: 'Envoyer 20 msgs et mettre 10 réactions', type: 'combo_msg_react', target: 1, rewardExp: 700, rewardCoins: 2800 },
  { id: 'spe_06', cat: 'SPE', label: 'Tout terrain',       desc: 'Utiliser 5 commandes et envoyer 30 msgs', type: 'combo_cmd_msg',   target: 1, rewardExp: 900, rewardCoins: 3500 },
  { id: 'spe_07', cat: 'SPE', label: 'Enrichissement',     desc: 'Gagner 1 000 coins et monter de niveau', type: 'combo_coins_lvl', target: 1, rewardExp: 1000, rewardCoins: 0  },
  { id: 'spe_08', cat: 'SPE', label: 'Grind total',        desc: 'Envoyer 50 msgs et gagner 2000 XP', type: 'combo_msg_xp',    target: 1, rewardExp: 1500, rewardCoins: 6000 },
  { id: 'spe_10', cat: 'SPE', label: 'Perfectionniste',    desc: 'Compléter toutes ses quêtes du jour', type: 'quests_done',  target: 10, rewardExp: 5000, rewardCoins: 20000 },
  { id: 'spe_11', cat: 'SPE', label: 'Rush',               desc: 'Envoyer 100 msgs ET 50 réactions', type: 'combo_msg_react2', target: 1, rewardExp: 2000, rewardCoins: 8000 },
  { id: 'spe_12', cat: 'SPE', label: 'Omniscient',         desc: 'Utiliser 15 commandes différentes', type: 'commands',      target: 15, rewardExp: 1200, rewardCoins: 5000 },
  { id: 'spe_13', cat: 'SPE', label: 'Double peine',       desc: 'Utiliser /rob 2 fois',          type: 'rob',              target: 2,  rewardExp: 600,  rewardCoins: 2500  },
  { id: 'spe_14', cat: 'SPE', label: 'Banquier suprême',   desc: 'Avoir 50 000 coins en banque',   type: 'bank_amount',      target: 50000, rewardExp: 1500, rewardCoins: 0  },
  { id: 'spe_15', cat: 'SPE', label: 'Full house',         desc: 'Parler, réagir et être en vocal le même jour', type: 'combo_all', target: 1, rewardExp: 1000, rewardCoins: 4000 },
];

module.exports = { QUEST_POOL };