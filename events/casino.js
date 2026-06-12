'use strict';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, saveUser } = require('../levels/db');
const { getConfig }         = require('../config');

const PREFIX = '=';

const EM = {
  coin:    '<:49c1a23b876841ce87e5aa7dbeacada9:1510067105767227423>',
  billet:  '<:fdfc6b7c937741879c66a369a1d2b635:1510067175246004234>',
  barre:   '<:Capture_d_cran_20260529_213837re:1510067261845668011>',
  jackpot: '<:jackpot:1510067147752214548>',
  perdu:   '<:26643crossmark:1510067005066055690>',
};

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return Math.abs(n).toLocaleString('fr-FR');
}
function re(color, desc) { return { embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] }; }
function noFunds(user, cost) {
  const needed = cost - user.wallet;
  if (user.bank >= needed)
    return re(0xef4444, `${EM.perdu} Pas assez sur toi ! Fais \`=with ${needed}\` pour retirer de la banque ${EM.coin}`);
  return re(0xef4444, `${EM.perdu} Pas assez de coins ! (${fmt(user.wallet)} sur toi · ${fmt(user.bank)} en banque) ${EM.coin}`);
}

// ── Cooldowns (burst : 3 uses libres, puis 15s) ───────────────
const BURST_MAX = 3;
const BURST_CD_MS = 15_000;
const burstMap = new Map(); // userId_cmd → { count, lockedUntil }
function checkCD(userId, cmd) {
  const data = burstMap.get(`${userId}_${cmd}`);
  if (!data?.lockedUntil) return 0;
  const rem = data.lockedUntil - Date.now();
  if (rem <= 0) { burstMap.delete(`${userId}_${cmd}`); return 0; }
  return Math.ceil(rem / 1000);
}
function setCD(userId, cmd) {
  const key = `${userId}_${cmd}`;
  const data = burstMap.get(key) || { count: 0, lockedUntil: 0 };
  data.count++;
  if (data.count >= BURST_MAX) { data.lockedUntil = Date.now() + BURST_CD_MS; data.count = 0; }
  burstMap.set(key, data);
}
function cdMsg(s) { return re(0xef4444, `${EM.perdu} 3 parties d'affilée — attends **${s}s** avant de rejouer.`); }

// ════════════════════════════════════════════════════════════
//  PILE OU FACE  =pf <mise> <pile|face>
// ════════════════════════════════════════════════════════════
async function cmdPF(msg, args) {
  const userId = msg.author.id;
  const s = checkCD(userId, 'pf'); if (s) return msg.reply(cdMsg(s));
  const mise  = parseInt(args[0]);
  const choix = args[1]?.toLowerCase();
  if (!mise || mise < 100) return msg.reply('❌ Usage : `=pf <mise> <pile|face>` (min 100)');
  if (!['pile','face'].includes(choix)) return msg.reply('❌ Choisis `pile` ou `face`.');
  const user = getUser(userId);
  if (user.wallet < mise) return msg.reply(noFunds(user, mise));
  const result = Math.random() < 0.5 ? 'pile' : 'face';
  const win    = result === choix;
  user.wallet += win ? mise : -mise;
  saveUser(user); setCD(userId, 'pf');
  msg.reply(re(win ? 0x22c55e : 0xef4444,
    `${result === 'pile' ? '🪙 Pile' : '💫 Face'} — ${win ? `${EM.billet} +${fmt(mise)}` : `${EM.barre} -${fmt(mise)}`} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  DÉ  =dice <mise> [1-6]
// ════════════════════════════════════════════════════════════
async function cmdDice(msg, args) {
  const userId = msg.author.id;
  const s = checkCD(userId, 'dice'); if (s) return msg.reply(cdMsg(s));
  const mise   = parseInt(args[0]);
  const numero = args[1] ? parseInt(args[1]) : null;
  if (!mise || mise < 100) return msg.reply('❌ Usage : `=dice <mise> [1-6]` (min 100)');
  if (numero !== null && (numero < 1 || numero > 6)) return msg.reply('❌ Numéro entre 1 et 6.');
  const user = getUser(userId);
  if (user.wallet < mise) return msg.reply(noFunds(user, mise));
  const FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  const roll  = Math.floor(Math.random() * 6) + 1;
  let gain = 0, result;
  if (numero !== null) {
    const win = roll === numero; gain = win ? mise * 5 : 0;
    result = win ? `✅ Exact ! Le dé affiche **${roll}**. +${fmt(mise * 4)} ${EM.coin}` : `❌ Raté ! Le dé affiche **${roll}**, pas **${numero}**.`;
  } else {
    const win = roll >= 4; gain = win ? mise * 2 : 0;
    result = win ? `✅ Haut (≥4) ! +${fmt(mise)} ${EM.coin}` : `❌ Bas (≤3) ! -${fmt(mise)} ${EM.coin}`;
  }
  user.wallet += gain - mise; saveUser(user); setCD(userId, 'dice');
  msg.reply({ embeds: [new EmbedBuilder().setColor(gain >= mise ? 0x22c55e : 0xef4444).setTitle('🎲 Dé')
    .setDescription([`${FACES[roll-1]} Ton dé : **${roll}**`, '', result, '', `Mise : ${fmt(mise)} ${EM.coin}`].join('\n'))] });
}

// ════════════════════════════════════════════════════════════
//  ROULETTE  =roulette <mise> <rouge|noir|vert>
// ════════════════════════════════════════════════════════════
async function cmdRoulette(msg, args) {
  const userId = msg.author.id;
  const s = checkCD(userId, 'roulette'); if (s) return msg.reply(cdMsg(s));
  const mise  = parseInt(args[0]);
  const choix = args[1]?.toLowerCase();
  if (!mise || mise < 100) return msg.reply('❌ Usage : `=roulette <mise> <rouge|noir|vert>` (min 100)');
  if (!['rouge','noir','vert'].includes(choix)) return msg.reply('❌ Choisis `rouge`, `noir` ou `vert`.');
  const user = getUser(userId);
  if (user.wallet < mise) return msg.reply(noFunds(user, mise));
  const r = Math.random();
  let result, icon;
  if (r < 0.027) { result = 'vert'; icon = '🟢'; }
  else if (r < 0.514) { result = 'rouge'; icon = '🔴'; }
  else { result = 'noir'; icon = '⚫'; }
  const multi = { rouge: 2, noir: 2, vert: 14 };
  const win = result === choix, gain = win ? mise * multi[choix] : 0;
  user.wallet += gain - mise; saveUser(user); setCD(userId, 'roulette');
  msg.reply(re(win ? 0x22c55e : 0xef4444,
    `🎡 ${icon} **${result}** — ${win ? `${EM.billet} +${fmt(gain-mise)} (x${multi[choix]})` : `${EM.barre} -${fmt(mise)}`} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  GOBELETS  =cup <mise> <1|2|3>
// ════════════════════════════════════════════════════════════
async function cmdCup(msg, args) {
  const userId = msg.author.id;
  const s = checkCD(userId, 'cup'); if (s) return msg.reply(cdMsg(s));
  const mise  = parseInt(args[0]);
  const choix = parseInt(args[1]);
  if (!mise || mise < 100) return msg.reply('❌ Usage : `=cup <mise> <1|2|3>` (min 100)');
  if (![1,2,3].includes(choix)) return msg.reply('❌ Choisis le gobelet 1, 2 ou 3.');
  const user = getUser(userId);
  if (user.wallet < mise) return msg.reply(noFunds(user, mise));
  const correct = Math.floor(Math.random() * 3) + 1;
  const win = choix === correct;
  user.wallet += win ? mise * 2 : -mise; saveUser(user); setCD(userId, 'cup');
  const cups = [1,2,3].map(n => `Gobelet ${n}: ${n === correct ? '🏆' : '💀'}`).join('\n');
  const result = win ? `✅ Bonne pioche ! ${EM.billet} +${fmt(mise * 2)} ${EM.coin}` : `❌ C'était le gobelet **${correct}** ! ${EM.barre} -${fmt(mise)} ${EM.coin}`;
  msg.reply({ embeds: [new EmbedBuilder().setColor(win ? 0x22c55e : 0xef4444).setTitle('🥤 Jeu des Gobelets')
    .setDescription([cups, '', result, '', `Mise : ${fmt(mise)} ${EM.coin}`].join('\n'))] });
}

// ════════════════════════════════════════════════════════════
//  PIERRE FEUILLE CISEAUX  =pfc <mise> <pierre|feuille|ciseaux>
// ════════════════════════════════════════════════════════════
async function cmdPFC(msg, args) {
  const userId = msg.author.id;
  const s = checkCD(userId, 'pfc'); if (s) return msg.reply(cdMsg(s));
  const mise  = parseInt(args[0]);
  const choix = args[1]?.toLowerCase();
  const ICONS = { pierre: '🪨', feuille: '📄', ciseaux: '✂️' };
  const CAP   = t => t.charAt(0).toUpperCase() + t.slice(1);
  if (!mise || mise < 100) return msg.reply('❌ Usage : `=pfc <mise> <pierre|feuille|ciseaux>` (min 100)');
  if (!ICONS[choix]) return msg.reply('❌ Choix : `pierre`, `feuille`, `ciseaux`.');
  const user = getUser(userId);
  if (user.wallet < mise) return msg.reply(noFunds(user, mise));
  const keys = Object.keys(ICONS), bot = keys[Math.floor(Math.random() * 3)];
  const beats = { pierre: 'ciseaux', feuille: 'pierre', ciseaux: 'feuille' };
  const win = beats[choix] === bot, draw = choix === bot;
  if (win) user.wallet += mise; else if (!draw) user.wallet -= mise;
  saveUser(user); setCD(userId, 'pfc');
  const result = win ? `✅ Tu gagnes ! ${EM.billet} +${fmt(mise)} ${EM.coin}` : draw ? `🤝 Égalité — remboursé` : `❌ Tu perds ! ${EM.barre} -${fmt(mise)} ${EM.coin}`;
  msg.reply({ embeds: [new EmbedBuilder().setColor(win ? 0x22c55e : draw ? 0xf59e0b : 0xef4444).setTitle('✊ Pierre Feuille Ciseaux')
    .setDescription([`${ICONS[choix]} **${CAP(choix)}** vs ${ICONS[bot]} **${CAP(bot)}**`, '', result, '', `Mise : ${fmt(mise)} ${EM.coin}`].join('\n'))] });
}

// ════════════════════════════════════════════════════════════
//  ROULETTE RUSSE  =rr <mise>
// ════════════════════════════════════════════════════════════
async function cmdRR(msg, args) {
  const userId = msg.author.id;
  const s = checkCD(userId, 'rr'); if (s) return msg.reply(cdMsg(s));
  const mise = parseInt(args[0]);
  if (!mise || mise < 100) return msg.reply('❌ Usage : `=rr <mise>` (min 100)');
  const user = getUser(userId);
  if (user.wallet < mise) return msg.reply(noFunds(user, mise));
  const fired = Math.random() < 1/6;
  const loss  = Math.min(mise * 3, user.wallet);
  if (fired) user.wallet -= loss; else user.wallet += Math.floor(mise * 0.5);
  saveUser(user); setCD(userId, 'rr');
  msg.reply(re(fired ? 0xef4444 : 0x22c55e,
    fired ? `💥 BANG ! ${EM.barre} -${fmt(loss)} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`
          : `😮‍💨 Click... ${EM.billet} +${fmt(Math.floor(mise*0.5))} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  SLOTS  =slots  (2500 coins, 4h/10 spins)
// ════════════════════════════════════════════════════════════
const SLOTS_COST = 2500, SLOTS_MAX = 200_000, SLOTS_CD = 4*3600*1000, SLOTS_MAX_SPINS = 10;
const slotsData = new Map();
const SYMS = [{e:'🍒',w:30,m:2},{e:'🍋',w:25,m:3},{e:'🍊',w:20,m:4},{e:'🍇',w:15,m:6},{e:'🔔',w:7,m:10},{e:'💎',w:2,m:25},{e:'7️⃣',w:1,m:50}];
const SYMS_TOT = SYMS.reduce((s,x)=>s+x.w,0);
function spinSym() { let r=Math.random()*SYMS_TOT; for(const s of SYMS){r-=s.w;if(r<=0)return s;} return SYMS[0]; }

async function cmdSlots(msg) {
  const userId = msg.author.id, user = getUser(userId);
  if (user.wallet < SLOTS_COST) return msg.reply(noFunds(user, SLOTS_COST));
  const now = Date.now(), data = slotsData.get(userId) || { spins: 0, resetAt: now + SLOTS_CD };
  if (now > data.resetAt) { data.spins = 0; data.resetAt = now + SLOTS_CD; }
  if (data.spins >= SLOTS_MAX_SPINS) {
    const d = data.resetAt - now;
    return msg.reply(`⏳ Limite **${SLOTS_MAX_SPINS} spins** atteinte. Reviens dans **${Math.floor(d/3600000)}h ${Math.floor(d%3600000/60000)}min**.`);
  }
  data.spins++; slotsData.set(userId, data); user.wallet -= SLOTS_COST;
  const [r1,r2,r3] = [spinSym(),spinSym(),spinSym()];
  let gain=0, line='';
  if (r1.e===r2.e&&r2.e===r3.e) { gain=Math.min(SLOTS_COST*r1.m,SLOTS_MAX); line=r1.m>=50?`${EM.jackpot} **JACKPOT x${r1.m}!!** +${fmt(gain)}`:`${EM.billet} **3x ${r1.e} x${r1.m}** +${fmt(gain)}`; }
  else if (r1.e===r2.e||r2.e===r3.e||r1.e===r3.e) { gain=SLOTS_COST; line=`🔄 2 identiques — remboursé`; }
  else { line=`${EM.barre} Aucune combinaison -${fmt(SLOTS_COST)}`; }
  user.wallet += gain; saveUser(user);
  msg.reply(re(gain>SLOTS_COST?0x22c55e:gain===SLOTS_COST?0xf59e0b:0xef4444,
    `${r1.e} ${r2.e} ${r3.e} — ${line} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin} · Spins : **${data.spins}/${SLOTS_MAX_SPINS}**`));
}

// ════════════════════════════════════════════════════════════
//  BLACKJACK  =bj <mise>
// ════════════════════════════════════════════════════════════
const bjGames = new Map(), bjCooldowns = new Map();
const SUITS=['♠️','♥️','♦️','♣️'], VALS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function mkDeck() { return SUITS.flatMap(s=>VALS.map(v=>({s,v}))).sort(()=>Math.random()-.5); }
function cval(c) { if(['J','Q','K'].includes(c.v))return 10; if(c.v==='A')return 11; return+c.v; }
function hval(h) { let t=h.reduce((s,c)=>s+cval(c),0),a=h.filter(c=>c.v==='A').length; while(t>21&&a--)t-=10; return t; }
function hstr(h,hide=false) { if(hide&&h.length>1)return`${h[0].v}${h[0].s} **??**`; return h.map(c=>`${c.v}${c.s}`).join(' '); }
function bjEmbed(g,reveal,title,color,res) {
  const pv=hval(g.player),dv=hval(g.dealer);
  const e=new EmbedBuilder().setColor(color).setTitle(title||'🎰 Black Jack')
    .addFields({name:'Votre main',value:`${hstr(g.player)}\n\nValeur: **${pv}**`,inline:true},{name:'Main du croupier',value:`${hstr(g.dealer,!reveal)}\n\nValeur: **${reveal?dv:'??'}**`,inline:true});
  if (res) e.setDescription(res);
  if (!reveal) e.addFields({name:'​',value:`Cartes restantes: **${g.deck.length}**\nMise : **${fmt(g.mise)}** ${EM.coin}`,inline:false});
  return e;
}
function bjRow(uid,canDouble) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel('Hit').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel('Stand').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`bj_double_${uid}`).setLabel('Double Down').setStyle(ButtonStyle.Secondary).setDisabled(!canDouble),
    new ButtonBuilder().setCustomId(`bj_split_${uid}`).setLabel('Split').setStyle(ButtonStyle.Secondary).setDisabled(true),
  );
}

async function cmdBJ(msg, args) {
  const userId = msg.author.id;
  const last = bjCooldowns.get(userId) || 0;
  const rem  = 15_000 - (Date.now() - last);
  if (rem > 0) return msg.reply(re(0xef4444, `${EM.perdu} Attends **${Math.ceil(rem/1000)}s** avant de relancer une partie de Black Jack.`));
  if (bjGames.has(userId)) {
    const stale = bjGames.get(userId);
    if (Date.now() - stale.startedAt < 120_000) return msg.reply('⚠️ Termine ta partie en cours !');
    bjGames.delete(userId);
  }
  const mise = parseInt(args[0]);
  if (!mise || mise < 100) return msg.reply('❌ Usage : `=bj <mise>` (min 100)');
  const user = getUser(userId);
  if (user.wallet < mise) return msg.reply(noFunds(user, mise));
  user.wallet -= mise; saveUser(user);
  const d = mkDeck();
  const g = { deck:d, player:[d.pop(),d.pop()], dealer:[d.pop(),d.pop()], mise, userId, startedAt:Date.now() };
  bjGames.set(userId, g);
  const pv=hval(g.player), dv=hval(g.dealer);
  if (pv===21) {
    bjGames.delete(userId); bjCooldowns.set(userId, Date.now());
    const u=getUser(userId);
    if (dv===21) { u.wallet+=mise; saveUser(u); return msg.reply({embeds:[bjEmbed(g,true,'🎰 Black Jack — Résultat',0xf59e0b,`🤝 Égalité ! (${pv} vs ${dv}) Mise remboursée`)]}); }
    const won=Math.floor(mise*2.5); u.wallet+=won; saveUser(u);
    return msg.reply({embeds:[bjEmbed(g,true,'🎰 Black Jack — Résultat',0x22c55e,`${EM.jackpot} Blackjack ! (${pv}) +${fmt(won-mise)} ${EM.coin}`)]});
  }
  const u2=getUser(userId);
  const m = await msg.reply({embeds:[bjEmbed(g,false,null,0x6366f1)],components:[bjRow(userId,u2.wallet>=mise)]});
  const collector = m.createMessageComponentCollector({time:60_000});
  collector.on('collect', async btn => {
    if (btn.user.id!==userId) return btn.reply({content:'❌ Ce n\'est pas ton jeu.',ephemeral:true});
    const game=bjGames.get(userId); if(!game)return;
    const u=getUser(userId), act=btn.customId.split('_')[1];
    if (act==='double') { if(u.wallet<game.mise)return btn.reply({content:'❌ Pas assez.',ephemeral:true}); u.wallet-=game.mise;game.mise*=2;saveUser(u);game.player.push(game.deck.pop()); }
    if (act==='hit') game.player.push(game.deck.pop());
    const pv2=hval(game.player);
    if (pv2>21) { bjGames.delete(userId);bjCooldowns.set(userId,Date.now());collector.stop(); return btn.update({embeds:[bjEmbed(game,true,'🎰 Black Jack — Bust !',0xef4444,`${EM.perdu} Tu dépasses 21 ! -${fmt(game.mise)} ${EM.coin}`)],components:[]}); }
    if (act==='stand'||act==='double'||pv2===21) {
      bjGames.delete(userId);bjCooldowns.set(userId,Date.now());collector.stop();
      while(hval(game.dealer)<17)game.dealer.push(game.deck.pop());
      const pv3=hval(game.player),dv2=hval(game.dealer);
      let color,res;
      if(dv2>21||pv3>dv2){const payout=Math.floor(game.mise*2.3);const profit=payout-game.mise;u.wallet+=payout;res=`✅ Victoire ! (${pv3} vs ${dv2}) +${fmt(profit)} ${EM.coin}`;color=0x22c55e;}
      else if(pv3===dv2){u.wallet+=game.mise;res=`🤝 Égalité ! (${pv3} vs ${dv2}) Remboursé`;color=0xf59e0b;}
      else{res=`${EM.perdu} Défaite ! (${pv3} vs ${dv2}) -${fmt(game.mise)} ${EM.coin}`;color=0xef4444;}
      saveUser(u); return btn.update({embeds:[bjEmbed(game,true,'🎰 Black Jack — Résultat',color,res)],components:[]});
    }
    btn.update({embeds:[bjEmbed(game,false,null,0x6366f1)],components:[bjRow(userId,false)]});
  });
  collector.on('end',(_,reason)=>{ if(reason!=='stop'&&bjGames.has(userId)){bjGames.delete(userId);const u=getUser(userId);u.wallet+=g.mise;saveUser(u);m.edit({content:'⏰ Temps écoulé — remboursé.',components:[]}).catch(()=>{});} });
}

// ════════════════════════════════════════════════════════════
//  SPIN  =spin
// ════════════════════════════════════════════════════════════
const SPIN_COST = 2500;
const SPIN_SYMS = [
  { e:'🏆', w:2,  m:28,  name:'Jackpot Absolu',  rarity:'LÉGENDAIRE', color:0xf5c842, icon:'👑', desc:'La roue de la fortune sourit aux audacieux' },
  { e:'💎', w:9,  m:9,   name:'Diamant Brut',     rarity:'TRÈS RARE',  color:0xa855f7, icon:'💜', desc:"Une pierre précieuse d'une valeur inestimable" },
  { e:'⭐', w:16, m:4,   name:"Lingot d'or",      rarity:'RARE',       color:0x38bdf8, icon:'💙', desc:'Un lingot massif' },
  { e:'🍒', w:21, m:2.2, name:'Cerise Dorée',     rarity:'PEU COMMUN', color:0x22c55e, icon:'💚', desc:'La chance du débutant' },
  { e:'🍊', w:26, m:1.6, name:'Orange Juteuse',   rarity:'COMMUN',     color:0x94a3b8, icon:'🩶', desc:'Un gain modeste mais appréciable' },
  { e:'🍋', w:26, m:1.3, name:'Citron Pressé',    rarity:'COMMUN',     color:0x94a3b8, icon:'🩶', desc:'Mieux que rien !' },
];
const SPIN_TOT = SPIN_SYMS.reduce((s,x)=>s+x.w,0);
function spinOne() { let r=Math.random()*SPIN_TOT; for(const s of SPIN_SYMS){r-=s.w;if(r<=0)return s;} return SPIN_SYMS[0]; }
function spinLose() {
  const r1=spinOne();
  const p2=SPIN_SYMS.filter(x=>x.e!==r1.e),t2=p2.reduce((a,x)=>a+x.w,0);
  let rr=Math.random()*t2,r2=p2[0]; for(const x of p2){rr-=x.w;if(rr<=0){r2=x;break;}}
  const p3=SPIN_SYMS.filter(x=>x.e!==r1.e&&x.e!==r2.e),t3=p3.reduce((a,x)=>a+x.w,0);
  let rrr=Math.random()*t3,r3=p3[0]; for(const x of p3){rrr-=x.w;if(rrr<=0){r3=x;break;}}
  return [r1,r2,r3];
}
// Calcule le résultat AVANT l'animation, pour que les rouleaux s'arrêtent
// un par un sur le résultat final (au lieu de tout changer d'un coup à la fin).
function computeSpinResult() {
  let r1, r2, r3, gain = 0, isWin = false, sym = null;
  if (Math.random() < 0.45) {
    sym = spinOne(); r1 = r2 = r3 = sym;
    gain = Math.min(Math.floor(SPIN_COST * sym.m), 200_000);
    isWin = true;
  } else {
    [r1,r2,r3] = spinLose();
  }
  return { r1, r2, r3, gain, isWin, sym };
}

// wallet = déjà après déduction SPIN_COST — ne pas soustraire une seconde fois
function buildSpinResult(wallet, result) {
  const { r1, r2, r3, gain, isWin, sym } = result;
  if (isWin) {
    const newWallet = wallet + gain;
    const rewardLine = sym.m >= 50
      ? `${EM.jackpot} **JACKPOT!!! +${fmt(gain)}** ${EM.coin} **(x${sym.m})**`
      : `+${EM.coin} **${fmt(gain)}** **(x${sym.m})**`;
    return { gain, newWallet, embed: new EmbedBuilder()
      .setColor(sym.color).setTitle('🎰 Casino Royal')
      .setDescription([
        `| ${r1.e} | ${r2.e} | ${r3.e} |`, '',
        `**${sym.name}**`,
        `${sym.icon} ${sym.rarity}`,
        `*${sym.desc}*`, '',
        rewardLine,
        `Mise : **${fmt(SPIN_COST)}** | Nouveau cash : **${fmt(newWallet)}** ${EM.coin}`,
      ].join('\n')) };
  } else {
    const newWallet = wallet;
    return { gain: 0, newWallet, embed: new EmbedBuilder()
      .setColor(0xef4444).setTitle('🎰 Casino Royal')
      .setDescription([
        `| ${r1.e} | ${r2.e} | ${r3.e} |`, '',
        '**Rien...**',
        `${EM.perdu} PERDU`,
        '*Pas de chance cette fois !*', '',
        `-${EM.coin} **${fmt(SPIN_COST)}**`,
        `Mise : **${fmt(SPIN_COST)}** | Nouveau cash : **${fmt(newWallet)}** ${EM.coin}`,
      ].join('\n')) };
  }
}

const delay = ms => new Promise(r => setTimeout(r, ms));
function mkSpinEmbed(name, a, b, c, spinning) {
  const dots = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧'];
  const status = spinning
    ? `${dots[Math.floor(Math.random()*dots.length)]} *Les rouleaux tournent...*`
    : '✅ *Les rouleaux se sont arrêtés !*';
  return new EmbedBuilder().setColor(0x6366f1).setTitle('🎰 Casino Royal')
    .setDescription([`**${name}** tire le levier...`,'',`| ${a} | ${b} | ${c} |`,'',status,'',`Mise : **${fmt(SPIN_COST)}** ${EM.coin}`].join('\n'));
}
// Anime les 3 rouleaux qui s'arrêtent UN PAR UN sur le résultat final
// (au lieu de tourner tous ensemble puis de changer d'un coup à la fin).
async function doAnimation(m, name, result) {
  const { r1, r2, r3 } = result;
  let a = '❔', b = '❔', c = '❔';
  const FRAMES = 3;
  for (let f = 0; f < FRAMES; f++) {
    a = spinOne().e; b = spinOne().e; c = spinOne().e;
    await delay(450);
    await m.edit({ embeds: [mkSpinEmbed(name, a, b, c, true)] }).catch(() => {});
  }
  a = r1.e;
  for (let f = 0; f < FRAMES; f++) {
    b = spinOne().e; c = spinOne().e;
    await delay(450);
    await m.edit({ embeds: [mkSpinEmbed(name, a, b, c, true)] }).catch(() => {});
  }
  b = r2.e;
  for (let f = 0; f < FRAMES; f++) {
    c = spinOne().e;
    await delay(450);
    await m.edit({ embeds: [mkSpinEmbed(name, a, b, c, true)] }).catch(() => {});
  }
  c = r3.e;
  await delay(400);
  await m.edit({ embeds: [mkSpinEmbed(name, a, b, c, false)] }).catch(() => {});
}
function spinRow(uid) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`spin_replay_${uid}`).setLabel('Rejouer').setEmoji('🎰').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`spin_lots_${uid}`).setLabel('Voir les lots').setEmoji('📋').setStyle(ButtonStyle.Secondary),
  );
}
const LOTS_EMBED = new EmbedBuilder().setColor(0x6366f1).setTitle('🎰 Lots — =spin')
  .setDescription([
    '🏆 **Jackpot Absolu** — x28 → 70 000 coins 👑 LÉGENDAIRE',
    '💎 **Diamant Brut** — x9 → 22 500 coins 💜 TRÈS RARE',
    '⭐ **Lingot d\'or** — x4 → 10 000 coins 💙 RARE',
    '🍒 **Cerise Dorée** — x2.2 → 5 500 coins 💚 PEU COMMUN',
    '🍊 **Orange Juteuse** — x1.6 → 4 000 coins 🩶 COMMUN',
    '🍋 **Citron Pressé** — x1.3 → 3 250 coins 🩶 COMMUN',
    '', '🎲 **45% de chance de gagner**',
  ].join('\n'));

async function cmdSpin(msg) {
  const userId = msg.author.id;
  const s = checkCD(userId, 'spin'); if (s) return msg.reply(cdMsg(s));
  const user = getUser(userId);
  if (user.wallet < SPIN_COST) return msg.reply(noFunds(user, SPIN_COST));
  user.wallet -= SPIN_COST; saveUser(user);
  const name = msg.member?.displayName ?? msg.author.username;
  const m = await msg.reply({ embeds: [mkSpinEmbed(name, '❔', '❔', '❔', true)] });
  const result = computeSpinResult();
  await doAnimation(m, name, result);
  const { embed, gain, newWallet } = buildSpinResult(user.wallet, result);
  user.wallet = newWallet; saveUser(user); setCD(userId, 'spin');
  await m.edit({ embeds: [embed], components: [spinRow(userId)] }).catch(() => {});
}

// ════════════════════════════════════════════════════════════
//  ROUTING
// ════════════════════════════════════════════════════════════
const CMDS = {
  bj: cmdBJ, slots: cmdSlots, pf: cmdPF, dice: cmdDice,
  roulette: cmdRoulette, cup: cmdCup, pfc: cmdPFC, rr: cmdRR, spin: cmdSpin,
};

module.exports = {
  init(client) {
    // Commandes préfixe
    client.on('messageCreate', async msg => {
      if (msg.author.bot || !msg.guild) return;
      const content = msg.content.trim();
      if (!content.startsWith(PREFIX)) return;
      const [cmd, ...args] = content.slice(1).trim().split(/\s+/);
      const name = cmd.toLowerCase();
      const handler = CMDS[name];
      if (!handler) return;
      const cfg = await getConfig();
      if ((cfg.disabled_commands || []).includes(name))
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`❌ La commande \`=${name}\` est désactivée.`)] });
      // Casino ban (Violet / Death Note / Tableflip)
      const { isCasinoBanned, fmtT } = require('../levels/buffs');
      const cu = getUser(msg.author.id);
      if (isCasinoBanned(cu)) {
        const rem = fmtT(cu.buffs.casinoBan.exp);
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`🎰 Tu es banni(e) du casino pendant encore **${rem}** !`)] });
      }
      try { await handler(msg, args); } catch(e) { console.error('[Casino]', e.message); }
    });

    // Boutons spin (interactionCreate)
    client.on('interactionCreate', async btn => {
      if (!btn.isButton() || !btn.customId.startsWith('spin_')) return;
      const userId = btn.customId.split('_').pop();
      if (btn.user.id !== userId) return btn.reply({ content: '❌ Ce n\'est pas ton spin.', ephemeral: true });
      if (btn.customId.startsWith('spin_lots_')) return btn.reply({ embeds: [LOTS_EMBED], ephemeral: true });
      if (btn.customId.startsWith('spin_replay_')) {
        const u = getUser(userId);
        if (u.wallet < SPIN_COST) return btn.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`${EM.perdu} Plus assez de coins !`)], ephemeral: true });
        const s = checkCD(userId, 'spin');
        if (s) return btn.reply(Object.assign(cdMsg(s), { ephemeral: true }));
        u.wallet -= SPIN_COST; saveUser(u);
        try {
          await btn.deferUpdate();
          const name = btn.member?.displayName ?? btn.user.username;
          const m    = btn.message;
          await m.edit({ embeds: [mkSpinEmbed(name, '❔', '❔', '❔', true)], components: [] }).catch(() => {});
          const result = computeSpinResult();
          await doAnimation(m, name, result);
          const res = buildSpinResult(u.wallet, result);
          u.wallet = res.newWallet; saveUser(u); setCD(userId, 'spin');
          await m.edit({ embeds: [res.embed], components: [spinRow(userId)] }).catch(() => {});
        } catch {
          // interaction expirée ou message supprimé — on a déjà sauvegardé le wallet
        }
      }
    });

    console.log('[Casino] ✅ =bj =slots =pf =dice =roulette =cup =pfc =rr =spin');
  },
};
