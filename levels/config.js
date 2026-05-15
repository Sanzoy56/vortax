module.exports = {
  // ─── Salons ───────────────────────────────────────────────
  CHANNELS: {
    RANKS:   '1500132032016285797',
    LEVELS:  '1500132108599955647',
    STREAKS: '1500132131173564586',
    QUETES:  '1500132151381852394',
  },

  // ─── Utilisateurs protégés ────────────────────────────────
  PROTECTED_USERS: [
    '1405637417272086588',
    '1323025414523977798',
  ],

  // ─── Rangs ────────────────────────────────────────────────
  RANKS: [
    { level: 1,   roleId: '1500111867228454952', name: 'Plastique' },
    { level: 4,   roleId: '1499486138488848394', name: 'Plastique 1' },
    { level: 7,   roleId: '1500111961722060891', name: 'Plastique 2' },
    { level: 10,  roleId: '1500112003589607475', name: 'Plastique 3' },
    { level: 13,  roleId: '1500112057855508481', name: 'Carton' },
    { level: 16,  roleId: '1500112122858962955', name: 'Carton 1' },
    { level: 19,  roleId: '1500112168866021428', name: 'Carton 2' },
    { level: 22,  roleId: '1500112194329903356', name: 'Carton 3' },
    { level: 25,  roleId: '1500112232854585404', name: 'Bronze' },
    { level: 28,  roleId: '1500112321689682070', name: 'Bronze 1' },
    { level: 31,  roleId: '1500112503215099954', name: 'Bronze 2' },
    { level: 34,  roleId: '1500112549113233428', name: 'Bronze 3' },
    { level: 37,  roleId: '1500112592327147550', name: 'Fer' },
    { level: 40,  roleId: '1500112650389164102', name: 'Fer 1' },
    { level: 43,  roleId: '1500112726079574187', name: 'Fer 2' },
    { level: 46,  roleId: '1500112767112446023', name: 'Fer 3' },
    { level: 49,  roleId: '1500112824020766720', name: 'Or' },
    { level: 52,  roleId: '1500112880970891446', name: 'Or 1' },
    { level: 55,  roleId: '1500112924897968159', name: 'Or 2' },
    { level: 58,  roleId: '1500112962097123360', name: 'Or 3' },
    { level: 61,  roleId: '1500113000458354870', name: 'Diamant' },
    { level: 64,  roleId: '1500113050953449693', name: 'Diamant 1' },
    { level: 67,  roleId: '1500113089561886790', name: 'Diamant 2' },
    { level: 70,  roleId: '1500113148076884009', name: 'Diamant 3' },
    { level: 73,  roleId: '1500113212455125135', name: 'Émeraude' },
    { level: 76,  roleId: '1500113268386168982', name: 'Émeraude 1' },
    { level: 79,  roleId: '1500113309565845775', name: 'Émeraude 2' },
    { level: 82,  roleId: '1500113348396843118', name: 'Émeraude 3' },
    { level: 85,  roleId: '1500113510011768982', name: 'Rubis' },
    { level: 88,  roleId: '1500113611174182932', name: 'Rubis 1' },
    { level: 91,  roleId: '1500113574314508390', name: 'Rubis 2' },
    { level: 94,  roleId: '1500113692631760896', name: 'Rubis 3' },
    { level: 97,  roleId: '1500113765654331567', name: 'Légendaire' },
    { level: 100, roleId: '1500113838195081236', name: 'Légendaire 1' },
    { level: 103, roleId: '1500113881043959918', name: 'Légendaire 2' },
    { level: 106, roleId: '1500113863230754946', name: 'Légendaire 3' },
    { level: 107, roleId: '1500114173676224662', name: 'Mythique' },
    { level: 108, roleId: '1500114196401229906', name: 'Mythique 1' },
    { level: 109, roleId: '1500114259667980289', name: 'Mythique 2' },
    { level: 110, roleId: '1500114314827141281', name: 'Mythique 3' },
    { level: 115, roleId: '1500114295223095316', name: 'GOAT' },  // ← level 115 pour éviter le doublon
  ],

  // ─── EXP ──────────────────────────────────────────────────
  EXP: {
    MIN_PER_MSG: 15,
    MAX_PER_MSG: 25,
    COOLDOWN_MS: 5000,
  },

  // ─── Coins ────────────────────────────────────────────────
  COINS: {
    MIN_PER_MSG: 5,
    MAX_PER_MSG: 15,
  },

  // ─── Streak ───────────────────────────────────────────────
  STREAK: {
    BONUS_PER_DAY: 0.02,
    MAX_BONUS: 0.5,
  },

  // ─── Rob ──────────────────────────────────────────────────
  ROB: {
    COOLDOWN_MS: 4 * 60 * 60 * 1000,
    MIN_PERCENT: 0.05,
    MAX_PERCENT: 0.2,
    SUCCESS_RATE: 0.6,
  },

  // ─── Boosts temporaires ──────────────────────────────────
  TEMP_BOOSTS: [
    { id: 'boost_exp_25_30m', label: '+25% EXP - 30 min', expBoost: 0.25, duration: 30, price: 30000 },
    { id: 'boost_exp_25_1h',  label: '+25% EXP - 1h',     expBoost: 0.25, duration: 60, price: 50000 },
    { id: 'boost_exp_50_30m', label: '+50% EXP - 30 min', expBoost: 0.5,  duration: 30, price: 70000 },
    { id: 'boost_exp_50_1h',  label: '+50% EXP - 1h',     expBoost: 0.5,  duration: 60, price: 120000 },
    { id: 'boost_coin_25_1h', label: '+25% Coins - 1h',   coinBoost: 0.25, duration: 60, price: 40000 },
    { id: 'boost_coin_50_1h', label: '+50% Coins - 1h',   coinBoost: 0.5,  duration: 60, price: 90000 },
  ],

  // ─── Boosts permanents ───────────────────────────────────
  ROLE_BOOSTS: [
    { id: 'role_exp_30',  label: '+30% EXP permanent',   expBoost: 0.3,  price: 1000000 },
    { id: 'role_exp_45',  label: '+45% EXP permanent',   expBoost: 0.45, price: 2500000 },
    { id: 'role_exp_60',  label: '+60% EXP permanent',   expBoost: 0.6,  price: 5000000 },
    { id: 'role_coin_30', label: '+30% Coins permanent', coinBoost: 0.3,  price: 1000000 },
    { id: 'role_coin_45', label: '+45% Coins permanent', coinBoost: 0.45, price: 2500000 },
    { id: 'role_coin_60', label: '+60% Coins permanent', coinBoost: 0.6,  price: 5000000 },
  ],

  // ─── Quêtes ───────────────────────────────────────────────
  QUEST_POOL: [
    { id: 'q_msg_20',    label: 'Envoyer 20 messages',    type: 'messages', target: 20,   rewardExp: 300,  rewardCoins: 150 },
    { id: 'q_msg_50',    label: 'Envoyer 50 messages',    type: 'messages', target: 50,   rewardExp: 700,  rewardCoins: 350 },
    { id: 'q_msg_100',   label: 'Envoyer 100 messages',   type: 'messages', target: 100,  rewardExp: 1500, rewardCoins: 750 },
    { id: 'q_coins_500', label: 'Gagner 500 VTX-Coins',   type: 'coins',    target: 500,  rewardExp: 400,  rewardCoins: 200 },
    { id: 'q_coins_2000',label: 'Gagner 2000 VTX-Coins',  type: 'coins',    target: 2000, rewardExp: 1000, rewardCoins: 500 },
    { id: 'q_exp_200',   label: 'Gagner 200 EXP',         type: 'exp',      target: 200,  rewardExp: 0,    rewardCoins: 300 },
    { id: 'q_exp_500',   label: 'Gagner 500 EXP',         type: 'exp',      target: 500,  rewardExp: 0,    rewardCoins: 700 },
    { id: 'q_streak',    label: 'Maintenir ton streak',   type: 'streak',   target: 1,    rewardExp: 500,  rewardCoins: 250 },
    { id: 'q_cmd_3',     label: 'Utiliser 3 commandes',   type: 'commands', target: 3,    rewardExp: 200,  rewardCoins: 100 },
  ],

  QUESTS_PER_DAY: 3,

  // ─── Canvas ───────────────────────────────────────────────
  CANVAS: {
    FONT_MAIN:   'Rajdhani',
    COLOR_BG:    '#0d0d1a',
    COLOR_CARD:  '#13132b',
    COLOR_ACC:   '#7c5cfc',
    COLOR_GOLD:  '#f5c842',
    COLOR_TEXT:  '#e8e8f0',
    COLOR_MUTED: '#6b6b8a',
  },
};