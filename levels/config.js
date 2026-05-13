module.exports = {
  // ─── Salons ───────────────────────────────────────────────
  CHANNELS: {
    RANKS:   '1500132032016285797',  // salon annonce level-up
    NIVEAU:  '1500132108599955647',  // salon niveaux
    STREAKS: '1500132131173564586',  // salon streaks
    QUETES:  '1500132151381852394',  // salon quêtes
  },

  // ─── Utilisateurs protégés (anti-rob) ─────────────────────
  PROTECTED_USERS: [
    '1405637417272086588', // Vortax
    '1323025414523977798', // Sanzoy
  ],

  // ─── Paliers de rangs (level requis → rôle ID) ────────────
  // Progression intelligente : rapide au début, exponentielle ensuite
  RANKS: [
    { level: 1,    roleId: '1500111867228454952', name: 'Plastique'      },
    { level: 3,    roleId: '1499486138488848394', name: 'Plastique 1'    },
    { level: 6,    roleId: '1500111961722060891', name: 'Plastique 2'    },
    { level: 10,   roleId: '1500112003589607475', name: 'Plastique 3'    },
    { level: 15,   roleId: '1500112057855508481', name: 'Carton'         },
    { level: 21,   roleId: '1500112122858962955', name: 'Carton 1'       },
    { level: 28,   roleId: '1500112168866021428', name: 'Carton 2'       },
    { level: 36,   roleId: '1500112194329903356', name: 'Carton 3'       },
    { level: 45,   roleId: '1500112232854585404', name: 'Bronze'         },
    { level: 55,   roleId: '1500112321689682070', name: 'Bronze 1'       },
    { level: 66,   roleId: '1500112503215099954', name: 'Bronze 2'       },
    { level: 78,   roleId: '1500112549113233428', name: 'Bronze 3'       },
    { level: 91,   roleId: '1500112592327147550', name: 'Fer'            },
    { level: 105,  roleId: '1500112650389164102', name: 'Fer 1'          },
    { level: 120,  roleId: '1500112726079574187', name: 'Fer 2'          },
    { level: 136,  roleId: '1500112767112446023', name: 'Fer 3'          },
    { level: 153,  roleId: '1500112824020766720', name: 'Or'             },
    { level: 171,  roleId: '1500112880970891446', name: 'Or 1'           },
    { level: 190,  roleId: '1500112924897968159', name: 'Or 2'           },
    { level: 210,  roleId: '1500112962097123360', name: 'Or 3'           },
    { level: 231,  roleId: '1500113000458354870', name: 'Diamant'        },
    { level: 253,  roleId: '1500113050953449693', name: 'Diamant 1'      },
    { level: 276,  roleId: '1500113089561886790', name: 'Diamant 2'      },
    { level: 300,  roleId: '1500113148076884009', name: 'Diamant 3'      },
    { level: 325,  roleId: '1500113212455125135', name: 'Émeraude'       },
    { level: 351,  roleId: '1500113268386168982', name: 'Émeraude 1'     },
    { level: 378,  roleId: '1500113309565845775', name: 'Émeraude 2'     },
    { level: 406,  roleId: '1500113348396843118', name: 'Émeraude 3'     },
    { level: 435,  roleId: '1500113510011768982', name: 'Rubis'          },
    { level: 465,  roleId: '1500113611174182932', name: 'Rubis 1'        },
    { level: 496,  roleId: '1500113574314508390', name: 'Rubis 2'        },
    { level: 528,  roleId: '1500113692631760896', name: 'Rubis 3'        },
    { level: 561,  roleId: '1500113765654331567', name: 'Légendaire'     },
    { level: 595,  roleId: '1500113838195081236', name: 'Légendaire 1'   },
    { level: 630,  roleId: '1500113881043959918', name: 'Légendaire 2'   },
    { level: 666,  roleId: '1500113863230754946', name: 'Légendaire 3'   },
    { level: 703,  roleId: '1500114173676224662', name: 'Mythique'       },
    { level: 741,  roleId: '1500114196401229906', name: 'Mythique 1'     },
    { level: 780,  roleId: '1500114259667980289', name: 'Mythique 2'     },
    { level: 820,  roleId: '1500114314827141281', name: 'Mythique 3'     },
    { level: 861,  roleId: '1500114295223095316', name: 'GOAT'           },
  ],

  // ─── EXP ──────────────────────────────────────────────────
  EXP: {
    MIN_PER_MSG: 15,
    MAX_PER_MSG: 25,
    COOLDOWN_MS: 60_000, // 1 message par minute compte pour l'XP
  },

  // ─── Coins par message ────────────────────────────────────
  COINS: {
    MIN_PER_MSG: 5,
    MAX_PER_MSG: 15,
  },

  // ─── Streak ───────────────────────────────────────────────
  STREAK: {
    BONUS_PER_DAY: 0.02, // +2% EXP par jour de streak
    MAX_BONUS: 0.50,     // cap à +50%
  },

  // ─── Rob ──────────────────────────────────────────────────
  ROB: {
    COOLDOWN_MS: 4 * 60 * 60 * 1000, // 4h
    MIN_PERCENT: 0.05,
    MAX_PERCENT: 0.20,
    SUCCESS_RATE: 0.60, // 60% de chance de réussir
  },

  // ─── Boutique Boosts Temporaires ─────────────────────────
  TEMP_BOOSTS: [
    { id: 'boost_exp_25_30m', label: '+25% EXP — 30 min',  expBoost: 0.25, duration: 30,  price: 30_000  },
    { id: 'boost_exp_25_1h',  label: '+25% EXP — 1h',      expBoost: 0.25, duration: 60,  price: 50_000  },
    { id: 'boost_exp_50_30m', label: '+50% EXP — 30 min',  expBoost: 0.50, duration: 30,  price: 70_000  },
    { id: 'boost_exp_50_1h',  label: '+50% EXP — 1h',      expBoost: 0.50, duration: 60,  price: 120_000 },
    { id: 'boost_coin_25_1h', label: '+25% Coins — 1h',    coinBoost: 0.25, duration: 60, price: 40_000  },
    { id: 'boost_coin_50_1h', label: '+50% Coins — 1h',    coinBoost: 0.50, duration: 60, price: 90_000  },
  ],

  // ─── Boutique Rôles (boosts permanents) ──────────────────
  ROLE_BOOSTS: [
    { id: 'role_exp_30',  label: '+30% EXP permanent',   expBoost: 0.30, price: 1_000_000, roleId: '1500261512764194877' },
    { id: 'role_exp_45',  label: '+45% EXP permanent',   expBoost: 0.45, price: 2_500_000, roleId: '1500261615868711114' },
    { id: 'role_exp_60',  label: '+60% EXP permanent',   expBoost: 0.60, price: 5_000_000, roleId: '1500261594624561303' },
    { id: 'role_coin_30', label: '+30% Coins permanent', coinBoost: 0.30, price: 1_000_000, roleId: '1500261748819628338' },
    { id: 'role_coin_45', label: '+45% Coins permanent', coinBoost: 0.45, price: 2_500_000, roleId: '1500261748689600712' },
    { id: 'role_coin_60', label: '+60% Coins permanent', coinBoost: 0.60, price: 5_000_000, roleId: '1500261896513917049' },
  ],

  // ─── Quêtes journalières (pool) ───────────────────────────
  QUEST_POOL: [
    { id: 'q_msg_20',     label: 'Envoyer 20 messages',       type: 'messages', target: 20,   rewardExp: 300,   rewardCoins: 150   },
    { id: 'q_msg_50',     label: 'Envoyer 50 messages',       type: 'messages', target: 50,   rewardExp: 700,   rewardCoins: 350   },
    { id: 'q_msg_100',    label: 'Envoyer 100 messages',      type: 'messages', target: 100,  rewardExp: 1500,  rewardCoins: 750   },
    { id: 'q_coins_500',  label: 'Gagner 500 VTX-Coins',      type: 'coins',    target: 500,  rewardExp: 400,   rewardCoins: 200   },
    { id: 'q_coins_2000', label: 'Gagner 2 000 VTX-Coins',    type: 'coins',    target: 2000, rewardExp: 1000,  rewardCoins: 500   },
    { id: 'q_exp_200',    label: 'Gagner 200 EXP',            type: 'exp',      target: 200,  rewardExp: 0,     rewardCoins: 300   },
    { id: 'q_exp_500',    label: 'Gagner 500 EXP',            type: 'exp',      target: 500,  rewardExp: 0,     rewardCoins: 700   },
    { id: 'q_streak',     label: 'Maintenir ton streak',       type: 'streak',   target: 1,    rewardExp: 500,   rewardCoins: 250   },
    { id: 'q_cmd_3',      label: 'Utiliser 3 commandes',      type: 'commands', target: 3,    rewardExp: 200,   rewardCoins: 100   },
  ],

  QUESTS_PER_DAY: 3,

  // ─── Canvas ───────────────────────────────────────────────
  CANVAS: {
    FONT_MAIN:  'Rajdhani',
    COLOR_BG:   '#0d0d1a',
    COLOR_CARD: '#13132b',
    COLOR_ACC:  '#7c5cfc',
    COLOR_GOLD: '#f5c842',
    COLOR_TEXT: '#e8e8f0',
    COLOR_MUTED:'#6b6b8a',
  },
};