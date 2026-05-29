'use strict';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, saveUser } = require('../levels/db');

const PREFIX = '=';

const EM = {
  coin:    '<:49c1a23b876841ce87e5aa7dbeacada9:1509174658321223691>',
  billet:  '<:fdfc6b7c937741879c66a369a1d2b635:1510005089073369148>',
  barre:   '<:Capture_d_cran_20260529_213837re:1510004586990145556>',
  jackpot: '<:jackpot:1510003670388047943>',
  perdu:   '<:26643crossmark:1509170295921971300>',
};

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return Math.abs(n).toLocaleString('fr-FR');
}
function e(color, desc) {
  return { embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] };
}
function parseMise(str) {
  if (!str) return null;
  const n = parseInt(str);
  return isNaN(n) || n < 100 ? null : n;
}

// ════════════════════════════════════════════════════════════
//  PILE OU FACE  =pf <mise> <pile|face>
// ════════════════════════════════════════════════════════════
async function cmdPF(msg, args) {
  const mise  = parseMise(args[0]);
  const choix = args[1]?.toLowerCase();
  if (!mise) return msg.reply('❌ Usage : `=pf <mise> <pile|face>` (min 100)');
  if (!['pile','face'].includes(choix)) return msg.reply('❌ Choisis `pile` ou `face`.');

  const user = getUser(msg.author.id);
  if (user.wallet < mise) return msg.reply(`❌ Tu n'as que **${fmt(user.wallet)}** 💵.`);

  const result = Math.random() < 0.5 ? 'pile' : 'face';
  const win    = result === choix;
  user.wallet += win ? mise : -mise;
  saveUser(user);

  msg.reply(e(win ? 0x22c55e : 0xef4444,
    `${result === 'pile' ? '🪙 Pile' : '💫 Face'} — ${win ? `${EM.billet} +${fmt(mise)}` : `${EM.barre} -${fmt(mise)}`} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  DÉ  =dice <mise> [1-6]
// ════════════════════════════════════════════════════════════
async function cmdDice(msg, args) {
  const mise   = parseMise(args[0]);
  const numero = args[1] ? parseInt(args[1]) : null;
  if (!mise) return msg.reply('❌ Usage : `=dice <mise> [1-6]` (min 100)');
  if (numero !== null && (numero < 1 || numero > 6)) return msg.reply('❌ Numéro entre 1 et 6.');

  const user = getUser(msg.author.id);
  if (user.wallet < mise) return msg.reply(`❌ Tu n'as que **${fmt(user.wallet)}** 💵.`);

  const DICE = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣'];
  const roll  = Math.floor(Math.random() * 6) + 1;

  let gain = 0, desc;
  if (numero !== null) {
    const win = roll === numero;
    gain = win ? mise * 5 : 0;
    desc = win ? `Dé : ${DICE[roll-1]} — Exact ! **+${fmt(mise*4)}** 💵` : `Dé : ${DICE[roll-1]} — Raté ! **-${fmt(mise)}** 💵`;
  } else {
    const win = roll >= 4;
    gain = win ? mise * 2 : 0;
    desc = win ? `Dé : ${DICE[roll-1]} (≥4) — **+${fmt(mise)}** 💵` : `Dé : ${DICE[roll-1]} (≤3) — **-${fmt(mise)}** 💵`;
  }
  user.wallet += gain - mise;
  saveUser(user);

  msg.reply(e(gain >= mise ? 0x22c55e : 0xef4444, `🎲 ${desc} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  ROULETTE  =roulette <mise> <rouge|noir|vert>
// ════════════════════════════════════════════════════════════
async function cmdRoulette(msg, args) {
  const mise  = parseMise(args[0]);
  const choix = args[1]?.toLowerCase();
  if (!mise) return msg.reply('❌ Usage : `=roulette <mise> <rouge|noir|vert>` (min 100)');
  if (!['rouge','noir','vert'].includes(choix)) return msg.reply('❌ Choix : `rouge`, `noir` ou `vert`.');

  const user = getUser(msg.author.id);
  if (user.wallet < mise) return msg.reply(`❌ Tu n'as que **${fmt(user.wallet)}** 💵.`);

  const r = Math.random();
  let result, icon;
  if (r < 0.027)      { result = 'vert';  icon = '🟢'; }
  else if (r < 0.514) { result = 'rouge'; icon = '🔴'; }
  else                 { result = 'noir';  icon = '⚫'; }

  const multi = { rouge: 2, noir: 2, vert: 14 };
  const win   = result === choix;
  const gain  = win ? mise * multi[choix] : 0;
  user.wallet += gain - mise;
  saveUser(user);

  msg.reply(e(win ? 0x22c55e : 0xef4444,
    `🎡 ${icon} **${result}** — ${win ? `${EM.billet} +${fmt(gain-mise)} (x${multi[choix]})` : `${EM.barre} -${fmt(mise)}`} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  GOBELETS  =cup <mise> <1|2|3>
// ════════════════════════════════════════════════════════════
async function cmdCup(msg, args) {
  const mise  = parseMise(args[0]);
  const choix = parseInt(args[1]);
  if (!mise) return msg.reply('❌ Usage : `=cup <mise> <1|2|3>` (min 100)');
  if (![1,2,3].includes(choix)) return msg.reply('❌ Choisis le gobelet 1, 2 ou 3.');

  const user = getUser(msg.author.id);
  if (user.wallet < mise) return msg.reply(`❌ Tu n'as que **${fmt(user.wallet)}** 💵.`);

  const correct = Math.floor(Math.random() * 3) + 1;
  const win     = choix === correct;
  user.wallet  += win ? mise * 2 : -mise;
  saveUser(user);

  const cups = [1,2,3].map(n => n === correct ? `🏆**${n}**` : `🥤${n}`).join(' ');
  msg.reply(e(win ? 0x22c55e : 0xef4444,
    `${cups} — ${win ? `${EM.billet} +${fmt(mise*2)}` : `${EM.perdu} Balle sous le **${correct}** ! -${fmt(mise)}`} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  PIERRE FEUILLE CISEAUX  =rps <mise> <pierre|feuille|ciseaux>
// ════════════════════════════════════════════════════════════
async function cmdRPS(msg, args) {
  const mise  = parseMise(args[0]);
  const choix = args[1]?.toLowerCase();
  const ICONS = { pierre: '🪨', feuille: '📄', ciseaux: '✂️' };
  if (!mise) return msg.reply('❌ Usage : `=rps <mise> <pierre|feuille|ciseaux>` (min 100)');
  if (!ICONS[choix]) return msg.reply('❌ Choix : `pierre`, `feuille`, `ciseaux`.');

  const user    = getUser(msg.author.id);
  if (user.wallet < mise) return msg.reply(`❌ Tu n'as que **${fmt(user.wallet)}** 💵.`);

  const keys   = Object.keys(ICONS);
  const bot    = keys[Math.floor(Math.random() * 3)];
  const beats  = { pierre: 'ciseaux', feuille: 'pierre', ciseaux: 'feuille' };
  const win    = beats[choix] === bot;
  const draw   = choix === bot;

  if (win)       user.wallet += mise;
  else if (!draw) user.wallet -= mise;
  saveUser(user);

  msg.reply(e(win ? 0x22c55e : draw ? 0xf59e0b : 0xef4444,
    `${ICONS[choix]} vs ${ICONS[bot]} — ${win ? `${EM.billet} +${fmt(mise)}` : draw ? `Égalité, remboursé` : `${EM.perdu} -${fmt(mise)}`} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  ROULETTE RUSSE  =rr <mise>
// ════════════════════════════════════════════════════════════
async function cmdRR(msg, args) {
  const mise = parseMise(args[0]);
  if (!mise) return msg.reply('❌ Usage : `=rr <mise>` (min 100)');

  const user = getUser(msg.author.id);
  if (user.wallet < mise) return msg.reply(`❌ Tu n'as que **${fmt(user.wallet)}** 💵.`);

  const fired = Math.random() < 1/6;
  const loss  = Math.min(mise * 3, user.wallet);
  if (fired) { user.wallet -= loss; }
  else       { user.wallet += Math.floor(mise * 0.5); }
  saveUser(user);

  msg.reply(e(fired ? 0xef4444 : 0x22c55e,
    fired
      ? `💥 BANG ! ${EM.barre} -${fmt(loss)} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`
      : `😮‍💨 Click... ${EM.billet} +${fmt(Math.floor(mise*0.5))} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  SLOTS  =slots  (coût 2500, max 200k, 4h/10 spins)
// ════════════════════════════════════════════════════════════
const SLOTS_COST = 2500, SLOTS_MAX = 200_000, SLOTS_CD = 4*3600*1000, SLOTS_MAX_SPINS = 10;
const slotsData  = new Map();

const SYMS = [
  { e:'🍒', w:30, m:2  },{ e:'🍋', w:25, m:3  },{ e:'🍊', w:20, m:4  },
  { e:'🍇', w:15, m:6  },{ e:'🔔', w:7,  m:10 },{ e:'💎', w:2,  m:25 },
  { e:'7️⃣', w:1,  m:50 },
];
const SYMS_TOT = SYMS.reduce((s,x)=>s+x.w,0);
function spinSym() {
  let r = Math.random() * SYMS_TOT;
  for (const s of SYMS) { r -= s.w; if (r<=0) return s; }
  return SYMS[0];
}

async function cmdSlots(msg) {
  const userId = msg.author.id;
  const user   = getUser(userId);

  if (user.wallet < SLOTS_COST)
    return msg.reply(`❌ Il faut **${fmt(SLOTS_COST)}** 💵 pour jouer (tu as **${fmt(user.wallet)}** 💵).`);

  const now  = Date.now();
  const data = slotsData.get(userId) || { spins: 0, resetAt: now + SLOTS_CD };
  if (now > data.resetAt) { data.spins = 0; data.resetAt = now + SLOTS_CD; }

  if (data.spins >= SLOTS_MAX_SPINS) {
    const d = data.resetAt - now;
    return msg.reply(`⏳ Limite de **${SLOTS_MAX_SPINS} spins** atteinte. Reviens dans **${Math.floor(d/3600000)}h ${Math.floor(d%3600000/60000)}min**.`);
  }

  data.spins++;
  slotsData.set(userId, data);
  user.wallet -= SLOTS_COST;

  const [r1,r2,r3] = [spinSym(), spinSym(), spinSym()];
  let gain = 0, line = '';

  if (r1.e===r2.e && r2.e===r3.e) {
    gain = Math.min(SLOTS_COST * r1.m, SLOTS_MAX);
    line = r1.m >= 50 ? `${EM.jackpot} **JACKPOT x${r1.m} !!** +${fmt(gain)}` : `${EM.billet} **3x ${r1.e} — x${r1.m}** +${fmt(gain)}`;
  } else if (r1.e===r2.e || r2.e===r3.e || r1.e===r3.e) {
    gain = SLOTS_COST;
    line = `🔄 2 identiques — remboursé`;
  } else {
    line = `${EM.barre} Aucune combinaison -${fmt(SLOTS_COST)}`;
  }

  user.wallet += gain;
  saveUser(user);

  msg.reply(e(gain > SLOTS_COST ? 0x22c55e : gain===SLOTS_COST ? 0xf59e0b : 0xef4444,
    `${r1.e} ${r2.e} ${r3.e} — ${line} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin} · Spins : **${data.spins}/${SLOTS_MAX_SPINS}**`));
}

// ════════════════════════════════════════════════════════════
//  BLACKJACK  =bj <mise>
// ════════════════════════════════════════════════════════════
const bjGames = new Map();

const SUITS = ['♠','♥','♦','♣'];
const VALS  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function deck()  { return SUITS.flatMap(s=>VALS.map(v=>({s,v}))).sort(()=>Math.random()-.5); }
function cval(c) { if(['J','Q','K'].includes(c.v)) return 10; if(c.v==='A') return 11; return +c.v; }
function hval(h) {
  let t = h.reduce((s,c)=>s+cval(c),0), a = h.filter(c=>c.v==='A').length;
  while(t>21&&a--) t-=10; return t;
}
function hstr(h, hide=false) {
  if(hide&&h.length>1) return `${h[0].v}${h[0].s}  🂠`;
  return h.map(c=>`${c.v}${c.s}`).join('  ');
}
function bjEmbed(g, reveal, title, color) {
  const pv = hval(g.player), dv = hval(g.dealer);
  const dealer = `Croupier${reveal?` (${dv})`:''}: ${hstr(g.dealer, !reveal)}`;
  const player = `Toi (${pv}): ${hstr(g.player)}`;
  const desc   = title ? `${title}\n${dealer} | ${player}` : `${dealer} | ${player}\nMise : **${fmt(g.mise)}** 💵`;
  return new EmbedBuilder().setColor(color).setDescription(desc);
}
function bjRow(uid, canDouble) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel('🃏 Tirer').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel('✋ Rester').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`bj_double_${uid}`).setLabel('⬆️ Doubler').setStyle(ButtonStyle.Success).setDisabled(!canDouble),
  );
}

async function cmdBJ(msg, args) {
  const userId = msg.author.id;
  const mise   = parseMise(args[0]);
  if (!mise) return msg.reply('❌ Usage : `=bj <mise>` (min 100)');
  if (bjGames.has(userId)) return msg.reply('⚠️ Termine ta partie en cours d\'abord !');

  const user = getUser(userId);
  if (user.wallet < mise) return msg.reply(`❌ Tu n'as que **${fmt(user.wallet)}** 💵.`);

  user.wallet -= mise;
  saveUser(user);

  const d = deck();
  const g = { deck: d, player: [d.pop(),d.pop()], dealer: [d.pop(),d.pop()], mise, userId };
  bjGames.set(userId, g);

  const pv = hval(g.player), dv = hval(g.dealer);

  // Blackjack naturel
  if (pv === 21) {
    bjGames.delete(userId);
    const u = getUser(userId);
    if (dv === 21) {
      u.wallet += mise;
      saveUser(u);
      return msg.reply({ embeds: [bjEmbed(g, true, `🤝 Double Blackjack — Égalité`, 0xf59e0b)] });
    }
    const won = Math.floor(mise * 2.5);
    u.wallet += won;
    saveUser(u);
    return msg.reply({ embeds: [bjEmbed(g, true, `🎉 Blackjack ! +${fmt(won-mise)} 💵`, 0x22c55e)] });
  }

  const canDouble = user.wallet >= mise;
  const m = await msg.reply({ embeds: [bjEmbed(g, false, null, 0x6366f1)], components: [bjRow(userId, canDouble)] });

  const collector = m.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async i => {
    if (i.user.id !== userId) return i.reply({ content: '❌ Ce n\'est pas ton jeu.', ephemeral: true });
    const game = bjGames.get(userId);
    if (!game) return;
    const u    = getUser(userId);
    const act  = i.customId.split('_')[1];

    if (act === 'double') {
      if (u.wallet < game.mise) return i.reply({ content: '❌ Pas assez.', ephemeral: true });
      u.wallet -= game.mise;
      game.mise *= 2;
      saveUser(u);
      game.player.push(game.deck.pop());
    }
    if (act === 'hit') game.player.push(game.deck.pop());

    const pv2 = hval(game.player);

    if (pv2 > 21) {
      bjGames.delete(userId); collector.stop();
      return i.update({ embeds: [bjEmbed(game, true, `💥 Bust ! -${fmt(game.mise)} 💵`, 0xef4444)], components: [] });
    }
    if (act === 'stand' || act === 'double' || pv2 === 21) {
      bjGames.delete(userId); collector.stop();
      while(hval(game.dealer)<17) game.dealer.push(game.deck.pop());
      const pv3=hval(game.player), dv2=hval(game.dealer);
      let color, title2;
      if (dv2>21||pv3>dv2)      { u.wallet+=game.mise*2; title2=`${EM.billet} Victoire ! +${fmt(game.mise)} ${EM.coin}`; color=0x22c55e; }
      else if (pv3===dv2)        { u.wallet+=game.mise;   title2=`🤝 Égalité — remboursé`;                              color=0xf59e0b; }
      else                       {                        title2=`${EM.perdu} Défaite ! -${fmt(game.mise)} ${EM.coin}`; color=0xef4444; }
      saveUser(u);
      return i.update({ embeds: [bjEmbed(game, true, title2, color)], components: [] });
    }

    const u2 = getUser(userId);
    return i.update({ embeds: [bjEmbed(game, false, null, 0x6366f1)], components: [bjRow(userId, false)] });
  });

  collector.on('end', (_,reason) => {
    if (reason!=='done' && bjGames.has(userId)) {
      bjGames.delete(userId);
      const u = getUser(userId); u.wallet += g.mise; saveUser(u);
      m.edit({ content:'⏰ Temps écoulé — mise remboursée.', components:[] }).catch(()=>{});
    }
  });
}

// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = {
  init(client) {
    client.on('messageCreate', async message => {
      if (message.author.bot || !message.guild) return;
      const content = message.content.trim();
      if (!content.startsWith(PREFIX)) return;
      const [cmd, ...args] = content.slice(1).trim().split(/\s+/);
      try {
        switch (cmd.toLowerCase()) {
          case 'bj':       await cmdBJ(message, args);       break;
          case 'slots':    await cmdSlots(message);          break;
          case 'pf':       await cmdPF(message, args);       break;
          case 'dice':     await cmdDice(message, args);     break;
          case 'roulette': await cmdRoulette(message, args); break;
          case 'cup':      await cmdCup(message, args);      break;
          case 'rps':      await cmdRPS(message, args);      break;
          case 'rr':       await cmdRR(message, args);       break;
        }
      } catch(e) { console.error('[Casino]', e.message); }
    });
    console.log('[Casino] ✅ =bj =slots =pf =dice =roulette =cup =rps =rr');
  },
};
