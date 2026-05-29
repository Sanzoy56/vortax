'use strict';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { getUser, saveUser } = require('../levels/db');

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
function re(color, desc) { return { embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] }; }

// ════════════════════════════════════════════════════════════
//  PILE OU FACE
// ════════════════════════════════════════════════════════════
async function cmdPF(i) {
  const mise  = i.options.getInteger('mise');
  const choix = i.options.getString('choix');
  const user  = getUser(i.user.id);
  if (user.wallet < mise) return i.reply({ content: `❌ Tu n'as que **${fmt(user.wallet)}** ${EM.coin}.`, ephemeral: true });
  const result = Math.random() < 0.5 ? 'pile' : 'face';
  const win    = result === choix;
  user.wallet += win ? mise : -mise;
  saveUser(user);
  i.reply(re(win ? 0x22c55e : 0xef4444,
    `${result === 'pile' ? '🪙 Pile' : '💫 Face'} — ${win ? `${EM.billet} +${fmt(mise)}` : `${EM.barre} -${fmt(mise)}`} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  DÉ
// ════════════════════════════════════════════════════════════
async function cmdDice(i) {
  const mise   = i.options.getInteger('mise');
  const numero = i.options.getInteger('numéro');
  const user   = getUser(i.user.id);
  if (user.wallet < mise) return i.reply({ content: `❌ Tu n'as que **${fmt(user.wallet)}** ${EM.coin}.`, ephemeral: true });
  const FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  const roll  = Math.floor(Math.random() * 6) + 1;
  let gain = 0, result;
  if (numero) {
    const win = roll === numero;
    gain = win ? mise * 5 : 0;
    result = win
      ? `✅ Exact ! Le dé affiche **${roll}**. Tu gagnes ${EM.billet} +${fmt(mise * 4)} ${EM.coin}`
      : `❌ Raté ! Le dé affiche **${roll}**, pas **${numero}**.`;
  } else {
    const win = roll >= 4;
    gain = win ? mise * 2 : 0;
    result = win
      ? `✅ Haut (≥4) ! Tu gagnes ${EM.billet} +${fmt(mise)} ${EM.coin}`
      : `❌ Bas (≤3) ! Tu perds ${EM.barre} -${fmt(mise)} ${EM.coin}`;
  }
  user.wallet += gain - mise;
  saveUser(user);
  i.reply({ embeds: [new EmbedBuilder()
    .setColor(gain >= mise ? 0x22c55e : 0xef4444)
    .setTitle('🎲 Dé')
    .setDescription([
      `${FACES[roll-1]} Ton dé : **${roll}**`,
      '',
      result,
      '',
      `Mise : ${fmt(mise)} ${EM.coin}`,
    ].join('\n'))] });
}

// ════════════════════════════════════════════════════════════
//  ROULETTE
// ════════════════════════════════════════════════════════════
async function cmdRoulette(i) {
  const mise  = i.options.getInteger('mise');
  const choix = i.options.getString('couleur');
  const user  = getUser(i.user.id);
  if (user.wallet < mise) return i.reply({ content: `❌ Tu n'as que **${fmt(user.wallet)}** ${EM.coin}.`, ephemeral: true });
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
  i.reply(re(win ? 0x22c55e : 0xef4444,
    `🎡 ${icon} **${result}** — ${win ? `${EM.billet} +${fmt(gain-mise)} (x${multi[choix]})` : `${EM.barre} -${fmt(mise)}`} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  GOBELETS
// ════════════════════════════════════════════════════════════
async function cmdCup(i) {
  const mise  = i.options.getInteger('mise');
  const choix = i.options.getInteger('gobelet');
  const user  = getUser(i.user.id);
  if (user.wallet < mise) return i.reply({ content: `❌ Tu n'as que **${fmt(user.wallet)}** ${EM.coin}.`, ephemeral: true });
  const correct = Math.floor(Math.random() * 3) + 1;
  const win     = choix === correct;
  user.wallet  += win ? mise * 2 : -mise;
  saveUser(user);
  const cups = [1,2,3].map(n => `Gobelet ${n}: ${n === correct ? '🏆' : '💀'}`).join('\n');
  const result = win
    ? `✅ Bonne pioche ! Tu gagnes ${EM.billet} +${fmt(mise * 2)} ${EM.coin}`
    : `❌ Raté ! C'était le gobelet **${correct}**. Tu perds ${EM.barre} ${fmt(mise)} ${EM.coin}.`;
  i.reply({ embeds: [new EmbedBuilder()
    .setColor(win ? 0x22c55e : 0xef4444)
    .setTitle('🥤 Jeu des Gobelets')
    .setDescription([cups, '', result, '', `Mise : ${fmt(mise)} ${EM.coin}`].join('\n'))] });
}

// ════════════════════════════════════════════════════════════
//  PIERRE FEUILLE CISEAUX
// ════════════════════════════════════════════════════════════
async function cmdRPS(i) {
  const mise  = i.options.getInteger('mise');
  const choix = i.options.getString('choix');
  const ICONS = { pierre: '🪨', feuille: '📄', ciseaux: '✂️' };
  const CAP   = s => s.charAt(0).toUpperCase() + s.slice(1);
  const user  = getUser(i.user.id);
  if (user.wallet < mise) return i.reply({ content: `❌ Tu n'as que **${fmt(user.wallet)}** ${EM.coin}.`, ephemeral: true });
  const keys  = Object.keys(ICONS);
  const bot   = keys[Math.floor(Math.random() * 3)];
  const beats = { pierre: 'ciseaux', feuille: 'pierre', ciseaux: 'feuille' };
  const win   = beats[choix] === bot;
  const draw  = choix === bot;
  if (win)        user.wallet += mise;
  else if (!draw) user.wallet -= mise;
  saveUser(user);
  const result = win
    ? `✅ Tu gagnes ! ${EM.billet} +${fmt(mise)} ${EM.coin}`
    : draw
    ? `🤝 Égalité — mise remboursée`
    : `❌ Tu perds ! ${EM.barre} -${fmt(mise)} ${EM.coin}`;
  i.reply({ embeds: [new EmbedBuilder()
    .setColor(win ? 0x22c55e : draw ? 0xf59e0b : 0xef4444)
    .setTitle('✊ Pierre Feuille Ciseaux')
    .setDescription([
      `${ICONS[choix]} **${CAP(choix)}** vs ${ICONS[bot]} **${CAP(bot)}**`,
      '',
      result,
      '',
      `Mise : ${fmt(mise)} ${EM.coin}`,
    ].join('\n'))] });
}

// ════════════════════════════════════════════════════════════
//  ROULETTE RUSSE
// ════════════════════════════════════════════════════════════
async function cmdRR(i) {
  const mise = i.options.getInteger('mise');
  const user = getUser(i.user.id);
  if (user.wallet < mise) return i.reply({ content: `❌ Tu n'as que **${fmt(user.wallet)}** ${EM.coin}.`, ephemeral: true });
  const fired = Math.random() < 1/6;
  const loss  = Math.min(mise * 3, user.wallet);
  if (fired) user.wallet -= loss;
  else       user.wallet += Math.floor(mise * 0.5);
  saveUser(user);
  i.reply(re(fired ? 0xef4444 : 0x22c55e,
    fired
      ? `💥 BANG ! ${EM.barre} -${fmt(loss)} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`
      : `😮‍💨 Click... ${EM.billet} +${fmt(Math.floor(mise*0.5))} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin}`));
}

// ════════════════════════════════════════════════════════════
//  SLOTS
// ════════════════════════════════════════════════════════════
const SLOTS_COST = 2500, SLOTS_MAX = 200_000, SLOTS_CD = 4*3600*1000, SLOTS_MAX_SPINS = 10;
const slotsData  = new Map();
const SYMS = [
  {e:'🍒',w:30,m:2},{e:'🍋',w:25,m:3},{e:'🍊',w:20,m:4},
  {e:'🍇',w:15,m:6},{e:'🔔',w:7,m:10},{e:'💎',w:2,m:25},{e:'7️⃣',w:1,m:50},
];
const SYMS_TOT = SYMS.reduce((s,x)=>s+x.w,0);
function spinSym() { let r=Math.random()*SYMS_TOT; for(const s of SYMS){r-=s.w;if(r<=0)return s;} return SYMS[0]; }

async function cmdSlots(i) {
  const userId = i.user.id;
  const user   = getUser(userId);
  if (user.wallet < SLOTS_COST)
    return i.reply({ content: `❌ Il faut **${fmt(SLOTS_COST)}** ${EM.coin} (tu as **${fmt(user.wallet)}** ${EM.coin}).`, ephemeral: true });
  const now  = Date.now();
  const data = slotsData.get(userId) || { spins: 0, resetAt: now + SLOTS_CD };
  if (now > data.resetAt) { data.spins = 0; data.resetAt = now + SLOTS_CD; }
  if (data.spins >= SLOTS_MAX_SPINS) {
    const d = data.resetAt - now;
    return i.reply({ content: `⏳ Limite **${SLOTS_MAX_SPINS} spins** atteinte. Reviens dans **${Math.floor(d/3600000)}h ${Math.floor(d%3600000/60000)}min**.`, ephemeral: true });
  }
  data.spins++; slotsData.set(userId, data);
  user.wallet -= SLOTS_COST;
  const [r1,r2,r3] = [spinSym(),spinSym(),spinSym()];
  let gain=0, line='';
  if (r1.e===r2.e&&r2.e===r3.e) {
    gain = Math.min(SLOTS_COST*r1.m, SLOTS_MAX);
    line = r1.m>=50 ? `${EM.jackpot} **JACKPOT x${r1.m}!!** +${fmt(gain)}` : `${EM.billet} **3x ${r1.e} x${r1.m}** +${fmt(gain)}`;
  } else if (r1.e===r2.e||r2.e===r3.e||r1.e===r3.e) {
    gain=SLOTS_COST; line=`🔄 2 identiques — remboursé`;
  } else {
    line=`${EM.barre} Aucune combinaison -${fmt(SLOTS_COST)}`;
  }
  user.wallet += gain; saveUser(user);
  i.reply(re(gain>SLOTS_COST?0x22c55e:gain===SLOTS_COST?0xf59e0b:0xef4444,
    `${r1.e} ${r2.e} ${r3.e} — ${line} ${EM.coin} · Solde : **${fmt(user.wallet)}** ${EM.coin} · Spins : **${data.spins}/${SLOTS_MAX_SPINS}**`));
}

// ════════════════════════════════════════════════════════════
//  BLACKJACK
// ════════════════════════════════════════════════════════════
const bjGames = new Map();
const SUITS=['♠️','♥️','♦️','♣️'], VALS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function mkDeck() { return SUITS.flatMap(s=>VALS.map(v=>({s,v}))).sort(()=>Math.random()-.5); }
function cval(c) { if(['J','Q','K'].includes(c.v))return 10; if(c.v==='A')return 11; return+c.v; }
function hval(h) { let t=h.reduce((s,c)=>s+cval(c),0),a=h.filter(c=>c.v==='A').length; while(t>21&&a--)t-=10; return t; }
function hstr(h,hide=false) {
  if(hide&&h.length>1) return `${h[0].v}${h[0].s} **??**`;
  return h.map(c=>`${c.v}${c.s}`).join(' ');
}
function bjEmbed(g, reveal, title, color, resultLine) {
  const pv=hval(g.player), dv=hval(g.dealer);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title || '🎰 Black Jack')
    .addFields(
      { name: 'Votre main',        value: `${hstr(g.player)}\n\nValeur: **${pv}**`,                        inline: true },
      { name: 'Main du croupier',  value: `${hstr(g.dealer, !reveal)}\n\nValeur: **${reveal ? dv : '??'}**`, inline: true },
    );
  if (resultLine) embed.setDescription(resultLine);
  if (!reveal) embed.addFields({ name: '​', value: `Cartes restantes: **${g.deck.length}**\nMise : **${fmt(g.mise)}** ${EM.coin}`, inline: false });
  return embed;
}
function bjRow(uid, canDouble) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel('Hit').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel('Stand').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`bj_double_${uid}`).setLabel('Double Down').setStyle(ButtonStyle.Secondary).setDisabled(!canDouble),
    new ButtonBuilder().setCustomId(`bj_split_${uid}`).setLabel('Split').setStyle(ButtonStyle.Secondary).setDisabled(true),
  );
}

async function cmdBJ(i) {
  const userId = i.user.id;
  const mise   = i.options.getInteger('mise');
  if (bjGames.has(userId)) return i.reply({ content: '⚠️ Termine ta partie en cours !', ephemeral: true });
  const user = getUser(userId);
  if (user.wallet < mise) return i.reply({ content: `❌ Tu n'as que **${fmt(user.wallet)}** ${EM.coin}.`, ephemeral: true });
  user.wallet -= mise; saveUser(user);
  const d = mkDeck();
  const g = { deck:d, player:[d.pop(),d.pop()], dealer:[d.pop(),d.pop()], mise, userId };
  bjGames.set(userId, g);
  const pv=hval(g.player), dv=hval(g.dealer);
  if (pv===21) {
    bjGames.delete(userId);
    const u=getUser(userId);
    if (dv===21) { u.wallet+=mise; saveUser(u); return i.reply({embeds:[bjEmbed(g,true,'🎰 Black Jack — Résultat',0xf59e0b,`🤝 Égalité ! (${pv} vs ${dv}) Mise remboursée`)]}); }
    const won=Math.floor(mise*2.5); u.wallet+=won; saveUser(u);
    return i.reply({embeds:[bjEmbed(g,true,'🎰 Black Jack — Résultat',0x22c55e,`${EM.jackpot} Blackjack ! (${pv}) +${fmt(won-mise)} ${EM.coin}`)]});
  }
  const u2=getUser(userId);
  const m = await i.reply({embeds:[bjEmbed(g,false,null,0x6366f1)],components:[bjRow(userId,u2.wallet>=mise)],fetchReply:true});
  const collector = m.createMessageComponentCollector({time:60_000});
  collector.on('collect', async btn => {
    if (btn.user.id!==userId) return btn.reply({content:'❌ Ce n\'est pas ton jeu.',ephemeral:true});
    const game=bjGames.get(userId); if(!game)return;
    const u=getUser(userId), act=btn.customId.split('_')[1];
    if (act==='double') {
      if (u.wallet<game.mise) return btn.reply({content:'❌ Pas assez.',ephemeral:true});
      u.wallet-=game.mise; game.mise*=2; saveUser(u); game.player.push(game.deck.pop());
    }
    if (act==='hit') game.player.push(game.deck.pop());
    const pv2=hval(game.player);
    if (pv2>21) {
      bjGames.delete(userId); collector.stop();
      return btn.update({embeds:[bjEmbed(game,true,'🎰 Black Jack — Bust !',0xef4444,`${EM.perdu} Tu dépasses 21 ! Tu perds ${EM.coin} **${fmt(game.mise)}**.`)],components:[]});
    }
    if (act==='stand'||act==='double'||pv2===21) {
      bjGames.delete(userId); collector.stop();
      while(hval(game.dealer)<17) game.dealer.push(game.deck.pop());
      const pv3=hval(game.player),dv2=hval(game.dealer);
      let color,result;
      if (dv2>21||pv3>dv2)  { u.wallet+=game.mise*2; result=`✅ Victoire ! (${pv3} vs ${dv2}) +${fmt(game.mise)} ${EM.coin}`; color=0x22c55e; }
      else if (pv3===dv2)    { u.wallet+=game.mise;   result=`🤝 Égalité ! (${pv3} vs ${dv2}) Mise remboursée`;               color=0xf59e0b; }
      else                   {                        result=`${EM.perdu} Défaite ! (${pv3} vs ${dv2}) -${fmt(game.mise)} ${EM.coin}`; color=0xef4444; }
      saveUser(u);
      return btn.update({embeds:[bjEmbed(game,true,'🎰 Black Jack — Résultat',color,result)],components:[]});
    }
    btn.update({embeds:[bjEmbed(game,false,null,0x6366f1)],components:[bjRow(userId,false)]});
  });
  collector.on('end',(_,reason)=>{
    if(reason!=='stop'&&bjGames.has(userId)){
      bjGames.delete(userId);
      const u=getUser(userId); u.wallet+=g.mise; saveUser(u);
      m.edit({content:'⏰ Temps écoulé — mise remboursée.',components:[]}).catch(()=>{});
    }
  });
}

// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
const COMMANDS = { bj: cmdBJ, slots: cmdSlots, pf: cmdPF, dice: cmdDice, roulette: cmdRoulette, cup: cmdCup, pfc: cmdRPS, rr: cmdRR };

module.exports = {
  init(client) {
    client.on('interactionCreate', async i => {
      if (!i.isChatInputCommand()) return;
      const handler = COMMANDS[i.commandName];
      if (handler) { try { await handler(i); } catch(e) { console.error('[Casino]', e.message); } }
    });
    client.on('interactionCreate', async i => {
      if (!i.isButton() || !i.customId.startsWith('bj_')) return;
      // handled inside cmdBJ collector
    });
    console.log('[Casino] ✅ /bj /slots /pf /dice /roulette /cup /pfc /rr');
  },
};
