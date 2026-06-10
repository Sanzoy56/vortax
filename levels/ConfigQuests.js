'use strict';

// ─── POOL DE 100 QUÊTES ───────────────────────────────────────
// Catégories : MSG, VOC, SOC, PRG, EVT, SPE
// Récompenses XP divisées par 5 par rapport aux valeurs d'origine :
// avec la formule de niveau (100 + niveau×50), les anciennes valeurs
// (jusqu'à 6000 XP) faisaient sauter 10+ niveaux d'un coup sur une seule quête.
const QUEST_POOL = [

  // ── MSG (messages) ──────────────────────────────────────────
  { id: 'msg_01', cat: 'MSG', label: 'Bavard',             desc: 'Anime le serveur : envoie 10 messages aujourd\'hui',          type: 'messages',  target: 10,    rewardExp: 30,   rewardCoins: 500   },
  { id: 'msg_02', cat: 'MSG', label: 'Communicant',        desc: 'Participe aux discussions : envoie 20 messages',          type: 'messages',  target: 20,    rewardExp: 60,   rewardCoins: 1000  },
  { id: 'msg_03', cat: 'MSG', label: 'Intarissable',       desc: 'Tu as la pêche : envoie 50 messages aujourd\'hui',          type: 'messages',  target: 50,    rewardExp: 140,  rewardCoins: 3000  },
  { id: 'msg_04', cat: 'MSG', label: 'Machine à écrire',   desc: 'Tape sans relâche : envoie 100 messages',         type: 'messages',  target: 100,   rewardExp: 240,  rewardCoins: 5000  },
  { id: 'msg_05', cat: 'MSG', label: 'Graphomane',         desc: 'Tu adores écrire : envoie 200 messages',         type: 'messages',  target: 200,   rewardExp: 400,  rewardCoins: 8000  },
  { id: 'msg_06', cat: 'MSG', label: 'Prolixe',            desc: 'Un vrai puits sans fond : envoie 300 messages',         type: 'messages',  target: 300,   rewardExp: 600,  rewardCoins: 12000 },
  { id: 'msg_07', cat: 'MSG', label: 'Inépuisable',        desc: 'Marathon de discussion : envoie 500 messages',         type: 'messages',  target: 500,   rewardExp: 1000, rewardCoins: 20000 },
  { id: 'msg_08', cat: 'MSG', label: 'Premier mot',        desc: 'Brise la glace : envoie ton premier message du jour',            type: 'messages',  target: 1,     rewardExp: 10,   rewardCoins: 200   },
  { id: 'msg_09', cat: 'MSG', label: 'Causant',            desc: 'Mets l\'ambiance : envoie 5 messages',           type: 'messages',  target: 5,     rewardExp: 20,   rewardCoins: 300   },
  { id: 'msg_10', cat: 'MSG', label: 'Encyclopédiste',     desc: 'Partage tes connaissances : envoie 150 messages',         type: 'messages',  target: 150,   rewardExp: 320,  rewardCoins: 6000  },
  { id: 'msg_11', cat: 'MSG', label: 'Speedrunner',        desc: 'Enchaîne à toute vitesse : envoie 30 messages',          type: 'messages',  target: 30,    rewardExp: 80,   rewardCoins: 1500  },
  { id: 'msg_12', cat: 'MSG', label: 'Logorrhée',          desc: 'Tu as toujours un truc à dire : envoie 75 messages',          type: 'messages',  target: 75,    rewardExp: 180,  rewardCoins: 3500  },
  { id: 'msg_13', cat: 'MSG', label: 'Verbeux',            desc: 'Impossible de te taire : envoie 250 messages',         type: 'messages',  target: 250,   rewardExp: 500,  rewardCoins: 10000 },
  { id: 'msg_14', cat: 'MSG', label: 'Sans filtre',        desc: 'Tu dis tout ce qui te passe par la tête : envoie 400 messages',         type: 'messages',  target: 400,   rewardExp: 800,  rewardCoins: 16000 },
  { id: 'msg_15', cat: 'MSG', label: 'Diarrhée verbale',   desc: 'Un vrai déluge de mots : envoie 600 messages',         type: 'messages',  target: 600,   rewardExp: 1200, rewardCoins: 25000 },

  // ── VOC (vocal) ─────────────────────────────────────────────
  { id: 'voc_01', cat: 'VOC', label: 'Présent',            desc: 'Montre que tu es là : reste 5 min en vocal',        type: 'vocal_min', target: 5,     rewardExp: 20,   rewardCoins: 400   },
  { id: 'voc_02', cat: 'VOC', label: 'Fidèle',             desc: 'Reste connecté : passe 15 min en vocal',       type: 'vocal_min', target: 15,    rewardExp: 60,   rewardCoins: 1200  },
  { id: 'voc_03', cat: 'VOC', label: 'Sédentaire',         desc: 'Installe-toi : reste 30 min en vocal',       type: 'vocal_min', target: 30,    rewardExp: 120,  rewardCoins: 2500  },
  { id: 'voc_04', cat: 'VOC', label: 'Enraciné',           desc: 'Pose tes valises : reste 1h en vocal',           type: 'vocal_min', target: 60,    rewardExp: 200,  rewardCoins: 4000  },
  { id: 'voc_05', cat: 'VOC', label: 'Colocataire',        desc: 'Tu vis presque ici : reste 2h en vocal',           type: 'vocal_min', target: 120,   rewardExp: 400,  rewardCoins: 8000  },
  { id: 'voc_06', cat: 'VOC', label: 'Animateur',          desc: 'Anime un vocal avec 3 personnes ou plus pendant 20 min', type: 'vocal_min', target: 20, rewardExp: 120, rewardCoins: 2500 },
  { id: 'voc_07', cat: 'VOC', label: 'Sociable',           desc: 'Discute en vocal avec une autre personne pendant 10 min', type: 'vocal_min', target: 10, rewardExp: 50, rewardCoins: 1000 },
  { id: 'voc_08', cat: 'VOC', label: 'Noctambule',         desc: 'Traîne tard : reste 45 min en vocal',       type: 'vocal_min', target: 45,    rewardExp: 160,  rewardCoins: 3200  },
  { id: 'voc_09', cat: 'VOC', label: 'Ermite vocal',       desc: 'Reste en vocal pendant 1h30',       type: 'vocal_min', target: 90,    rewardExp: 300,  rewardCoins: 6000  },
  { id: 'voc_10', cat: 'VOC', label: 'Marathonien',        desc: 'Tiens la distance : reste 3h en vocal',           type: 'vocal_min', target: 180,   rewardExp: 600,  rewardCoins: 12000 },

  // ── SOC (social/réactions) ──────────────────────────────────
  { id: 'soc_01', cat: 'SOC', label: 'Réactionneur',       desc: 'Réagis aux messages : mets 5 réactions',           type: 'reactions', target: 5,     rewardExp: 20,   rewardCoins: 400   },
  { id: 'soc_02', cat: 'SOC', label: 'Expressif',          desc: 'Montre tes émotions : mets 10 réactions',          type: 'reactions', target: 10,    rewardExp: 40,   rewardCoins: 800   },
  { id: 'soc_03', cat: 'SOC', label: 'Émotif',             desc: 'Exprime-toi : mets 20 réactions',          type: 'reactions', target: 20,    rewardExp: 80,   rewardCoins: 1600  },
  { id: 'soc_04', cat: 'SOC', label: 'Vibrant',            desc: 'Partage ton ressenti : mets 30 réactions',          type: 'reactions', target: 30,    rewardExp: 100,  rewardCoins: 2000  },
  { id: 'soc_05', cat: 'SOC', label: 'Hyperactif',         desc: 'Réagis à tout : mets 50 réactions',          type: 'reactions', target: 50,    rewardExp: 160,  rewardCoins: 3000  },
  { id: 'soc_06', cat: 'SOC', label: 'Émoji addict',       desc: 'Tu ne peux pas t\'en empêcher : mets 75 réactions',          type: 'reactions', target: 75,    rewardExp: 240,  rewardCoins: 5000  },
  { id: 'soc_07', cat: 'SOC', label: 'Spammeur d\'émojis', desc: 'Inonde le serveur de réactions : mets-en 100',         type: 'reactions', target: 100,   rewardExp: 300,  rewardCoins: 6000  },
  { id: 'soc_08', cat: 'SOC', label: 'Timide',             desc: 'Lance-toi en douceur : mets 1 réaction sur un message',            type: 'reactions', target: 1,     rewardExp: 10,   rewardCoins: 200   },
  { id: 'soc_09', cat: 'SOC', label: 'Enthousiaste',       desc: 'Montre ton enthousiasme : mets 3 réactions',           type: 'reactions', target: 3,     rewardExp: 16,   rewardCoins: 300   },
  { id: 'soc_10', cat: 'SOC', label: 'Reactor',            desc: 'Sois actif : mets 15 réactions sur des messages',          type: 'reactions', target: 15,    rewardExp: 60,   rewardCoins: 1200  },

  // ── PRG (progression/XP/coins) ──────────────────────────────
  { id: 'prg_01', cat: 'PRG', label: 'Gagne-petit',        desc: 'Commence en douceur : gagne 100 XP aujourd\'hui',   type: 'exp',       target: 100,   rewardExp: 0,    rewardCoins: 500   },
  { id: 'prg_02', cat: 'PRG', label: 'En progression',     desc: 'Continue sur ta lancée : gagne 300 XP aujourd\'hui',   type: 'exp',       target: 300,   rewardExp: 0,    rewardCoins: 1200  },
  { id: 'prg_03', cat: 'PRG', label: 'XP addict',          desc: 'Tu en veux toujours plus : gagne 1 500 XP aujourd\'hui', type: 'exp',       target: 1500,  rewardExp: 0,    rewardCoins: 3000  },
  { id: 'prg_04', cat: 'PRG', label: 'Grinder',            desc: 'Grind sans relâche : gagne 3 000 XP aujourd\'hui', type: 'exp',       target: 3000,  rewardExp: 0,    rewardCoins: 6000  },
  { id: 'prg_05', cat: 'PRG', label: 'Hardcore',           desc: 'Sors le grand jeu : gagne 5 000 XP en une journée', type: 'exp',       target: 5000,  rewardExp: 0,    rewardCoins: 10000 },
  // CORRIGÉ : type 'coins_earned' pour les coins gagnés (messages), distinct de 'bank'
  { id: 'prg_06', cat: 'PRG', label: 'Riche',              desc: 'Fais grossir ton portefeuille : gagne 500 VTX-Coins',         type: 'coins_earned', target: 500,  rewardExp: 40,   rewardCoins: 0  },
  { id: 'prg_07', cat: 'PRG', label: 'Fortuné',            desc: 'Amasse une belle somme : gagne 2 000 VTX-Coins',       type: 'coins_earned', target: 2000, rewardExp: 100,  rewardCoins: 0  },
  { id: 'prg_08', cat: 'PRG', label: 'Millionnaire',       desc: 'Vise le gros lot : gagne 5 000 VTX-Coins',       type: 'coins_earned', target: 5000, rewardExp: 200,  rewardCoins: 0  },
  // CORRIGÉ : type 'bank' pour déposer en banque
  { id: 'prg_10', cat: 'PRG', label: 'Investisseur',       desc: 'Mets de l\'argent à l\'abri : utilise /dep pour déposer en banque',type: 'bank',      target: 1,     rewardExp: 30,   rewardCoins: 600   },
  // CORRIGÉ : type 'bank_amount' pour vérifier le solde en banque
  { id: 'prg_11', cat: 'PRG', label: 'Économe',            desc: 'Constitue-toi une épargne : aie 10 000 VTX-Coins en banque', type: 'bank_amount', target: 10000, rewardExp: 160, rewardCoins: 0 },
  { id: 'prg_12', cat: 'PRG', label: 'Casseur de niveaux', desc: 'Gagne assez d\'XP pour passer au niveau supérieur',              type: 'levelup',   target: 1,     rewardExp: 0,    rewardCoins: 2000  },
  { id: 'prg_13', cat: 'PRG', label: 'Spendthrift',        desc: 'Fais chauffer la carte : dépense 1 000 VTX-Coins en boutique',     type: 'spend',     target: 1000,  rewardExp: 60,   rewardCoins: 0     },
  { id: 'prg_14', cat: 'PRG', label: 'Gros dépensier',     desc: 'Vide ton portefeuille : dépense 5 000 VTX-Coins en boutique',     type: 'spend',     target: 5000,  rewardExp: 160,  rewardCoins: 0     },
  { id: 'prg_15', cat: 'PRG', label: 'XP 500',             desc: 'Mets les bouchées doubles : gagne 500 XP aujourd\'hui',   type: 'exp',       target: 500,   rewardExp: 0,    rewardCoins: 2000  },

  // ── EVT (événements spéciaux) ───────────────────────────────
  { id: 'evt_01', cat: 'EVT', label: 'Matinal',            desc: 'Lève-toi tôt : envoie un message avant 9h',  type: 'morning',   target: 1,     rewardExp: 40,   rewardCoins: 800   },
  { id: 'evt_02', cat: 'EVT', label: 'Noctambule',         desc: 'Traîne tard : envoie un message après 23h', type: 'night',     target: 1,     rewardExp: 40,   rewardCoins: 800   },
  { id: 'evt_05', cat: 'EVT', label: 'Flambeur',           desc: 'Tente ta chance : utilise =rob une fois',                type: 'rob',       target: 1,     rewardExp: 60,   rewardCoins: 1000  },
  { id: 'evt_06', cat: 'EVT', label: 'Banquier',           desc: 'Gère tes finances : utilise /dep ou /with',       type: 'bank',      target: 1,     rewardExp: 30,   rewardCoins: 600   },
  { id: 'evt_07', cat: 'EVT', label: 'Visiteur',           desc: 'Découvre le bot : utilise 5 commandes',         type: 'commands',  target: 5,     rewardExp: 40,   rewardCoins: 800   },
  { id: 'evt_08', cat: 'EVT', label: 'Explorateur',        desc: 'Explore les commandes du bot : utilises-en 10',        type: 'commands',  target: 10,    rewardExp: 80,   rewardCoins: 1500  },
  { id: 'evt_09', cat: 'EVT', label: 'Curieux',            desc: 'Teste un peu tout : utilise 3 commandes',         type: 'commands',  target: 3,     rewardExp: 30,   rewardCoins: 600   },
  { id: 'evt_13', cat: 'EVT', label: 'Lève-tôt',           desc: 'Sois matinal : envoie un message avant 8h',  type: 'morning',   target: 1,     rewardExp: 60,   rewardCoins: 1200  },
  { id: 'evt_14', cat: 'EVT', label: 'Nuit blanche',       desc: 'Ne dors jamais : envoie un message après minuit', type: 'night', target: 1,     rewardExp: 60,   rewardCoins: 1200  },
  { id: 'evt_15', cat: 'EVT', label: 'Shopaholic',         desc: 'Craque pour un article : achète quelque chose en boutique', type: 'spend', target: 1,   rewardExp: 50,   rewardCoins: 1000  },

  // ── SPE (spéciales) ─────────────────────────────────────────
  { id: 'spe_12', cat: 'SPE', label: 'Omniscient',         desc: 'Maîtrise le bot : utilise 15 commandes au total',         type: 'commands',    target: 15,    rewardExp: 240,  rewardCoins: 5000  },
  { id: 'spe_13', cat: 'SPE', label: 'Double peine',       desc: 'Récidive : utilise =rob 2 fois',          type: 'rob',         target: 2,     rewardExp: 120,  rewardCoins: 2500  },
  { id: 'spe_14', cat: 'SPE', label: 'Banquier suprême',   desc: 'Construis une fortune : aie 50 000 VTX-Coins en banque',  type: 'bank_amount', target: 50000, rewardExp: 300,  rewardCoins: 0     },
  { id: 'spe_16', cat: 'SPE', label: 'Multi-niveaux',      desc: 'Enchaîne les niveaux : monte 3 fois de niveau',       type: 'levelup',     target: 3,     rewardExp: 0,    rewardCoins: 6000  },
  { id: 'spe_17', cat: 'SPE', label: 'Shopaholic',         desc: 'Vide complètement ton compte : dépense 10 000 VTX-Coins en boutique', type: 'spend', target: 10000, rewardExp: 100,  rewardCoins: 0   },
];

module.exports = { QUEST_POOL };
