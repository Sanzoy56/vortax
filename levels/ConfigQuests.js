'use strict';
// ─── POOL DE QUÊTES ────────────────────────────────────────────
// Catégories : MSG, VOC, SOC, PRG, EVT, SPE
//
// Champs spéciaux :
//   - uniqueTrack: true   → la progression = nombre d'éléments uniques vus (voir quests.js)
//   - minRankLevel: N     → pour reply_rank / mention_rank, le membre visé doit être
//                           niveau >= N (basé sur config.js → RANKS)
//   - tier: 1              → peut sortir en quête QUOTIDIENNE (auto, tirée seule)
//   - tier: 2              → peut sortir en quête HEBDO (auto, tirée seule)
//   - tier absent          → réservée au slot À CHOIX (généralement les SPE,
//                            plus corsées / plus gratifiantes, on ne veut pas
//                            qu'elles tombent au hasard sans que le joueur choisisse)
//
// Le slot "à choix" pioche dans TOUT le pool (tier 1, 2 ou sans tier).

const QUEST_POOL = [

  // ── MSG (messages) ──────────────────────────────────────────
  { id: 'msg_08', cat: 'MSG', label: 'Premier mot',        desc: 'Brise la glace : envoie ton premier message',          type: 'messages', target: 1,   tier: 1, rewardExp: 10,   rewardCoins: 200   },
  { id: 'msg_09', cat: 'MSG', label: 'Causant',            desc: 'Mets l\'ambiance : envoie 5 messages',                 type: 'messages', target: 5,   tier: 1, rewardExp: 20,   rewardCoins: 300   },
  { id: 'msg_01', cat: 'MSG', label: 'Bavard',             desc: 'Anime le serveur : envoie 10 messages',                type: 'messages', target: 10,  tier: 1, rewardExp: 30,   rewardCoins: 500   },
  { id: 'msg_02', cat: 'MSG', label: 'Communicant',        desc: 'Participe aux discussions : envoie 20 messages',       type: 'messages', target: 20,  tier: 1, rewardExp: 60,   rewardCoins: 1000  },
  { id: 'msg_11', cat: 'MSG', label: 'Speedrunner',        desc: 'Enchaîne : envoie 30 messages',                        type: 'messages', target: 30,  tier: 1, rewardExp: 80,   rewardCoins: 1500  },
  { id: 'msg_03', cat: 'MSG', label: 'Intarissable',       desc: 'Envoie 50 messages',                                   type: 'messages', target: 50,  tier: 2, rewardExp: 140,  rewardCoins: 3000  },
  { id: 'msg_12', cat: 'MSG', label: 'Logorrhée',          desc: 'Envoie 75 messages',                                   type: 'messages', target: 75,  tier: 2, rewardExp: 180,  rewardCoins: 3500  },
  { id: 'msg_04', cat: 'MSG', label: 'Machine à écrire',   desc: 'Tape sans relâche : envoie 100 messages',              type: 'messages', target: 100, tier: 2, rewardExp: 240,  rewardCoins: 5000  },
  { id: 'msg_05', cat: 'MSG', label: 'Graphomane',         desc: 'Envoie 200 messages',                                  type: 'messages', target: 200, tier: 2, rewardExp: 400,  rewardCoins: 8000  },
  { id: 'msg_13', cat: 'MSG', label: 'Verbeux',            desc: 'Impossible de te taire : envoie 250 messages',         type: 'messages', target: 250, tier: 2, rewardExp: 500,  rewardCoins: 10000 },

  // ── VOC (vocal) ─────────────────────────────────────────────
  { id: 'voc_01', cat: 'VOC', label: 'Présent',            desc: 'Montre que tu es là : reste 5 min en vocal',           type: 'vocal_min', target: 5,   tier: 1, rewardExp: 20,   rewardCoins: 400   },
  { id: 'voc_07', cat: 'VOC', label: 'Sociable',           desc: 'Discute en vocal à deux pendant 10 min',               type: 'vocal_min', target: 10,  tier: 1, rewardExp: 50,   rewardCoins: 1000  },
  { id: 'voc_02', cat: 'VOC', label: 'Fidèle',             desc: 'Passe 15 min en vocal',                                type: 'vocal_min', target: 15,  tier: 1, rewardExp: 60,   rewardCoins: 1200  },
  { id: 'voc_06', cat: 'VOC', label: 'Animateur',          desc: 'Anime un vocal à 3+ personnes pendant 20 min',         type: 'vocal_min', target: 20,  tier: 1, rewardExp: 120,  rewardCoins: 2500  },
  { id: 'voc_03', cat: 'VOC', label: 'Sédentaire',         desc: 'Reste 30 min en vocal',                                type: 'vocal_min', target: 30,  tier: 2, rewardExp: 120,  rewardCoins: 2500  },
  { id: 'voc_08', cat: 'VOC', label: 'Noctambule',         desc: 'Reste 45 min en vocal',                                type: 'vocal_min', target: 45,  tier: 2, rewardExp: 160,  rewardCoins: 3200  },
  { id: 'voc_04', cat: 'VOC', label: 'Enraciné',           desc: 'Reste 1h en vocal',                                    type: 'vocal_min', target: 60,  tier: 2, rewardExp: 200,  rewardCoins: 4000  },

  // ── SOC (social) ─────────────────────────────────────────────
  { id: 'soc_08', cat: 'SOC', label: 'Timide',             desc: 'Lance-toi : mets 1 réaction',                          type: 'reactions', target: 1,  tier: 1, rewardExp: 10,   rewardCoins: 200   },
  { id: 'soc_01', cat: 'SOC', label: 'Réactionneur',       desc: 'Mets 5 réactions',                                     type: 'reactions', target: 5,  tier: 1, rewardExp: 20,   rewardCoins: 400   },
  { id: 'soc_02', cat: 'SOC', label: 'Expressif',          desc: 'Mets 10 réactions',                                    type: 'reactions', target: 10, tier: 1, rewardExp: 40,   rewardCoins: 800   },
  { id: 'soc_16', cat: 'SOC', label: 'Illustrateur',       desc: 'Poste une image ou un fichier',                        type: 'attachment', target: 1, tier: 1, rewardExp: 30,  rewardCoins: 600  },
  { id: 'soc_11', cat: 'SOC', label: 'Respectueux',        desc: 'Réponds à un membre rang Bronze ou +',                 type: 'reply_rank', target: 1,  minRankLevel: 25, tier: 1, rewardExp: 60,  rewardCoins: 1200 },
  { id: 'soc_14', cat: 'SOC', label: 'Interpellation',     desc: 'Mentionne un membre rang Carton ou +',                 type: 'mention_rank', target: 1, minRankLevel: 13, tier: 1, rewardExp: 40,  rewardCoins: 800  },
  { id: 'soc_03', cat: 'SOC', label: 'Émotif',             desc: 'Mets 20 réactions',                                    type: 'reactions', target: 20, tier: 2, rewardExp: 80,   rewardCoins: 1600  },
  { id: 'soc_05', cat: 'SOC', label: 'Hyperactif',         desc: 'Mets 50 réactions',                                    type: 'reactions', target: 50, tier: 2, rewardExp: 160,  rewardCoins: 3000  },
  { id: 'soc_17', cat: 'SOC', label: 'Galerie',            desc: 'Poste 3 images ou fichiers',                           type: 'attachment', target: 3, tier: 2, rewardExp: 90,  rewardCoins: 1800 },
  { id: 'soc_12', cat: 'SOC', label: 'Sur le radar',       desc: 'Réponds 3 fois à des membres rang Fer ou +',           type: 'reply_rank', target: 3,  minRankLevel: 37, tier: 2, rewardExp: 160, rewardCoins: 3200 },
  { id: 'soc_13', cat: 'SOC', label: 'Networking',         desc: 'Réponds à un membre rang Or ou +',                     type: 'reply_rank', target: 1,  minRankLevel: 49, rewardExp: 200, rewardCoins: 4000 },
  { id: 'soc_15', cat: 'SOC', label: 'VIP call',           desc: 'Mentionne un membre rang Diamant ou +',                type: 'mention_rank', target: 1, minRankLevel: 61, rewardExp: 260, rewardCoins: 5200 },

  // ── PRG (progression) ───────────────────────────────────────
  { id: 'prg_01', cat: 'PRG', label: 'Gagne-petit',        desc: 'Gagne 100 XP',                                         type: 'exp',       target: 100,  tier: 1, rewardExp: 0, rewardCoins: 500   },
  { id: 'prg_10', cat: 'PRG', label: 'Investisseur',       desc: 'Dépose de l\'argent en banque avec /dep',              type: 'bank',      target: 1,    tier: 1, rewardExp: 30,  rewardCoins: 600   },
  { id: 'prg_06', cat: 'PRG', label: 'Riche',              desc: 'Gagne 500 VTX-Coins',                                  type: 'coins_earned', target: 500, tier: 1, rewardExp: 40,  rewardCoins: 0 },
  { id: 'prg_02', cat: 'PRG', label: 'En progression',     desc: 'Gagne 300 XP',                                         type: 'exp',       target: 300,  tier: 1, rewardExp: 0, rewardCoins: 1200  },
  { id: 'prg_16', cat: 'PRG', label: 'Explorateur social', desc: 'Envoie un message dans 3 salons différents',           type: 'unique_channels', target: 3, uniqueTrack: true, tier: 1, rewardExp: 100, rewardCoins: 2000 },
  { id: 'prg_03', cat: 'PRG', label: 'XP addict',          desc: 'Gagne 1 500 XP',                                       type: 'exp',       target: 1500, tier: 2, rewardExp: 0, rewardCoins: 3000  },
  { id: 'prg_07', cat: 'PRG', label: 'Fortuné',            desc: 'Gagne 2 000 VTX-Coins',                                type: 'coins_earned', target: 2000, tier: 2, rewardExp: 100, rewardCoins: 0 },
  { id: 'prg_11', cat: 'PRG', label: 'Économe',            desc: 'Aie 10 000 VTX-Coins en banque',                       type: 'bank_amount', target: 10000, tier: 2, rewardExp: 160, rewardCoins: 0 },
  { id: 'prg_12', cat: 'PRG', label: 'Casseur de niveaux', desc: 'Passe un niveau',                                      type: 'levelup',   target: 1,     tier: 2, rewardExp: 0,   rewardCoins: 2000 },
  { id: 'prg_13', cat: 'PRG', label: 'Spendthrift',        desc: 'Dépense 1 000 VTX-Coins en boutique',                  type: 'spend',     target: 1000,  tier: 2, rewardExp: 60,  rewardCoins: 0     },
  { id: 'prg_17', cat: 'PRG', label: 'Globe-trotter',      desc: 'Envoie un message dans 5 salons différents',           type: 'unique_channels', target: 5, uniqueTrack: true, tier: 2, rewardExp: 180, rewardCoins: 3600 },

  // ── EVT (événements) ────────────────────────────────────────
  { id: 'evt_01', cat: 'EVT', label: 'Matinal',            desc: 'Envoie un message avant 9h',                          type: 'morning',  target: 1, tier: 1, rewardExp: 40, rewardCoins: 800  },
  { id: 'evt_02', cat: 'EVT', label: 'Noctambule',         desc: 'Envoie un message après 23h',                         type: 'night',    target: 1, tier: 1, rewardExp: 40, rewardCoins: 800  },
  { id: 'evt_05', cat: 'EVT', label: 'Flambeur',           desc: 'Utilise =rob une fois',                               type: 'rob',      target: 1, tier: 1, rewardExp: 60, rewardCoins: 1000 },
  { id: 'evt_07', cat: 'EVT', label: 'Visiteur',           desc: 'Utilise 5 commandes',                                 type: 'commands', target: 5, tier: 1, rewardExp: 40, rewardCoins: 800  },
  { id: 'evt_15', cat: 'EVT', label: 'Shopaholic',         desc: 'Achète quelque chose en boutique',                    type: 'spend',    target: 1, tier: 1, rewardExp: 50, rewardCoins: 1000 },
  { id: 'evt_08', cat: 'EVT', label: 'Explorateur',        desc: 'Utilise 10 commandes',                                type: 'commands', target: 10, tier: 2, rewardExp: 80, rewardCoins: 1500 },

  // ── SPE (spéciales — réservées au slot "à choix", pas de tier) ──
  { id: 'spe_12', cat: 'SPE', label: 'Omniscient',         desc: 'Utilise 15 commandes au total',                       type: 'commands',    target: 15,    rewardExp: 240, rewardCoins: 5000 },
  { id: 'spe_14', cat: 'SPE', label: 'Banquier suprême',   desc: 'Aie 50 000 VTX-Coins en banque',                      type: 'bank_amount', target: 50000, rewardExp: 300, rewardCoins: 0    },
  { id: 'spe_16', cat: 'SPE', label: 'Multi-niveaux',      desc: 'Monte 3 fois de niveau',                              type: 'levelup',     target: 3,     rewardExp: 0,   rewardCoins: 6000 },
];

module.exports = { QUEST_POOL };