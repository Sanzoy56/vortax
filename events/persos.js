'use strict';
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, saveUser } = require('../levels/db');

const PREFIX = '=';

const TIER_COLORS = { S: 0xf5c842, A: 0xa855f7, B: 0x38bdf8, C: 0x22c55e };
const TIER_LABELS = {
  S: '💥 TIER S — Légendaire',
  A: '⚡ TIER A — Épique+',
  B: '🔵 TIER B — Épique',
  C: '🟢 TIER C — Rare',
};

const PERSOS = {
  gojo: {
    name: 'Satoru Gojo', anime: 'Jujutsu Kaisen', tier: 'S', emoji: '♾️', role: '@Satoru Gojo',
    techniques: [
      { name: '🔵 Blue',             cmd: '=blue @user',        desc: 'Aspire 10k–30k de la bank de la cible · CD : 8h' },
      { name: '🔵 Blue Max',         cmd: '=bluemax',           desc: 'Intercepte les gains eco du salon 30s · CD : 1j' },
      { name: '🔴 Red',              cmd: '=red @user',         desc: 'Casse boucliers normaux + counter-rob 10min (voleur perd 10%) · CD : 3h' },
      { name: '🔴 Red Max',          cmd: '=redmax @user',      desc: 'Casse boucliers + counter-tout 10min (attaquant perd 20%, toi +30%) · CD : 8h' },
      { name: '🟣 Violet',           cmd: '=violet @user',      desc: 'Ban casino 1h/2h/4h aléatoire · CD : 3j' },
      { name: '🏴 Infinite Void',    cmd: '=territoire',        desc: 'Bloque le salon pour toi seul 5 min · CD : 9j' },
      { name: '♾️ Infini',           cmd: '=infini',            desc: 'Protection absolue 12h — brisable UNIQUEMENT par Sukuna (=worldslash) ou Saitama (=seriouspunch) · CD : 1j' },
      { name: '🌟 Éveil',            cmd: '=awak',              desc: 'Mode Dieu 24h — toutes techniques boostées · Débloque =lastblue et =lastred · CD : 12j' },
      { name: '🌀 Last Blue',        cmd: '=lastblue',          desc: 'Absorbe toutes attaques offensives + familiers 15min · CD : 4j' },
      { name: '🌊 Last Red',         cmd: '=lastred',           desc: 'Repousse toutes attaques + KO 1min ceux qui parlent pendant 6min · CD : 4j' },
    ],
  },

  sukuna: {
    name: 'Ryomen Sukuna', anime: 'Jujutsu Kaisen', tier: 'S', emoji: '👹', role: '@Ryomen Sukuna',
    techniques: [
      { name: '1 Doigt — Cleave',           cmd: '=cleave @user',      desc: 'Casse les boucliers basiques (Heian : casse anti-rob améliorés sauf Infini) · CD : 3h' },
      { name: '2 Doigts — Cache',           cmd: '=cache',             desc: 'Anti-rob amélioré 3h (Heian : 9h) · CD : 8h' },
      { name: '3 Doigts — SpiderWeb',       cmd: '=spiderweb',         desc: 'Stun 5min la prochaine personne qui parle (Heian : les 5 prochaines) · CD : 1j' },
      { name: '5 Doigts — Dismantle',       cmd: '=dismantle @user',   desc: 'Effets aléatoires (break/malus/-bank) · Heian : break amélioré + 2 malus + -20% bank · CD : 2j' },
      { name: '6 Doigts — Transformation', cmd: '=transfo',            desc: 'Rôle Receptacle — collect 12k/30h · Heian : rôle Heian Form — collect 24k/24h · CD : 3j' },
      { name: '8–10 Doigts — Fuga',        cmd: '=fuga @user',        desc: '8d=10%/100k · 9d=15%/150k · 10d=20%/200k bank · CD : 4j' },
      { name: '12 Doigts — Extension',      cmd: '=extension @user',   desc: 'Dismantle + Cleave sur 1 personne · CD : 3j' },
      { name: '15 Doigts — Extension Zone', cmd: '=extension-all',     desc: 'Extension sur tout le salon · Domain Simple protège (sauf Heian) · CD : 12j' },
      { name: '19 Doigts — World Cutting Slash', cmd: '=worldslash @user', desc: 'Brise TOUT sans exception, y compris l\'Infini de Gojo · CD : 14j' },
      { name: '20 Doigts — Heian Form',    cmd: '=heian',             desc: 'Toutes techniques boostées pendant 12h · CD : 14j' },
      { name: '🛡️ Domain Simple',          cmd: '=domain',            desc: 'Protection 1h contre Extension Zone + Infinite Void de Gojo · CD : 1j' },
    ],
  },

  saitama: {
    name: 'Saitama', anime: 'One Punch Man', tier: 'S', emoji: '👊', role: '@Saitama',
    techniques: [
      { name: '👊 Normal Punch',                    cmd: '=normalpunch @user',      desc: 'Rob x3 — ignore tous les boucliers sauf Infini · CD : 5j' },
      { name: '👊👊 Consecutive Normal Punches',    cmd: '=consecutivepunch @user', desc: 'Rob x2 sur les 3 prochaines personnes qui tapent une commande dans le salon · CD : 7j' },
      { name: '🛡️ Cape Shield',                    cmd: '=cape',                   desc: 'Absorbe la prochaine attaque reçue · CD : 5j' },
      { name: '♾️ Limitless Potential',             cmd: '=limitless',              desc: 'Double tous les gains pendant 24h · CD : 14j' },
      { name: '🎰 Serious Table Flip',              cmd: '=tableflip @user',        desc: 'Ban casino 7 jours + malus gains -75% pendant 24h · CD : 15j' },
      { name: '💀 Megaton Punch',                   cmd: '=megaton @user',          desc: 'Vole 35% wallet — ignore tout sauf Infini · CD : 10j' },
      { name: '☄️ Serious Series : Serious Punch',  cmd: '=seriouspunch @user',     desc: 'Vole 40% wallet + 30% banque — ignore ABSOLUMENT TOUT, y compris l\'Infini · CD : 20j' },
    ],
  },

  goku: {
    name: 'Son Goku', anime: 'Dragon Ball', tier: 'A', emoji: '⚡', role: '@Son Goku',
    techniques: [
      { name: '🟡 Kaioken',             cmd: '=kaioken',            desc: 'Rob x1.5 + gains +50% pendant 4h · CD : 4h' },
      { name: '🟡 Kaioken x10',         cmd: '=kaiokenx10',         desc: 'Rob x2.5 + brise bouclier normal · CD : 1j' },
      { name: '🔵 Kamehameha',          cmd: '=kamehameha @user',   desc: 'Aspire 15k–40k du wallet de la cible · CD : 8h' },
      { name: '⚡ Super Saiyan',        cmd: '=ssj',                desc: 'Rob x2 + immunité contre-attaque 6h · CD : 3j' },
      { name: '💙 Super Saiyan Blue',   cmd: '=ssjblue',            desc: 'Rob x2.5 + gains x2 pendant 12h · Débloque =ssjblue2 · CD : 7j' },
      { name: '💙 SSJ Blue Évolué',     cmd: '=ssjblue2',           desc: 'Immunité 12h + rob x3 + brise Cache Heian · Nécessite SSJ Blue actif · CD : 10j' },
      { name: '🌀 Instant Transmission',cmd: '=instant @user',      desc: 'Rob furtif — ignore boucliers normaux, aucun counter-rob possible · CD : 2j' },
      { name: '🌟 Ultra Instinct',      cmd: '=ultrainstinct',      desc: 'Esquive toutes les attaques 8h + brise Cache Heian · CD : 7j' },
      { name: '💥 Spirit Bomb',         cmd: '=spiritbomb @user',   desc: 'Vole 20% wallet + 15% banque · Ignore boucliers normaux + Cache Heian · CD : 12j' },
      { name: '👁️ True Ultra Instinct', cmd: '=trueinstinct',       desc: 'Immunité 24h + renvoie 100% des attaques + brise Cache Heian · CD : 14j' },
    ],
  },

  naruto: {
    name: 'Naruto Uzumaki', anime: 'Naruto', tier: 'A', emoji: '🍥', role: '@Naruto Uzumaki',
    techniques: [
      { name: '🔵 Rasengan',         cmd: '=rasengan @user',       desc: 'Rob x1.5 · CD : 4h' },
      { name: '🌀 Shadow Clone',     cmd: '=shadowclone @user',    desc: '3 tentatives de rob, garde le meilleur résultat · CD : 1j' },
      { name: '😂 Talk no Jutsu',    cmd: '=talkjutsu @user',      desc: 'Retire le bouclier basique de la cible + vole 5k directement · CD : 2j' },
      { name: '🌟 Rasenshuriken',    cmd: '=rasenshuriken @user',  desc: 'Rob x2.5 + brise bouclier normal · CD : 3j' },
      { name: '💸 Rasengan Bank',    cmd: '=rasenbankgan @user',   desc: 'Vole 15% de la banque de la cible · CD : 4j' },
      { name: '🍃 Sage Mode',        cmd: '=sagemode',             desc: 'Bouclier 8h + brise automatiquement le bouclier basique de l\'attaquant · CD : 6j' },
      { name: '🦊 Kyuubi Mode',      cmd: '=kyuubi',               desc: 'Rob x2 + gains x2 pendant 8h + brise Cache Heian · CD : 7j' },
      { name: '💣 Bijuu Bomb',       cmd: '=bijuubomb @user',      desc: 'Vole 20% wallet + 15% banque · Ignore boucliers normaux + Cache Heian · CD : 8j' },
      { name: '🌐 Six Paths Sage',   cmd: '=sixpaths',             desc: 'Immunité 12h + gains x2 · Débloque =baryonmode · CD : 10j' },
      { name: '☄️ Baryon Mode',      cmd: '=baryonmode @user',     desc: 'Vole 30% wallet + 20% banque · Ignore tout sauf Infini · Nécessite Six Paths actif · CD : 14j' },
    ],
  },

  vegeta: {
    name: 'Vegeta', anime: 'Dragon Ball', tier: 'B', emoji: '👑', role: '@Vegeta',
    techniques: [
      { name: '💢 Energy Blast',      cmd: '=energyblast @user',    desc: 'Rob x1.2 · CD : 3h' },
      { name: '🔫 Galick Gun',        cmd: '=galickgun @user',      desc: 'Aspire 8k–20k du wallet de la cible · CD : 8h' },
      { name: '🔥 Final Flash',       cmd: '=finalflash @user',     desc: 'Rob x2 + 40% chance de brise bouclier normal · CD : 3j' },
      { name: '💣 Big Bang Attack',   cmd: '=bigbang @user',        desc: 'Vole 8% de la banque de la cible · CD : 5j' },
      { name: '⚡ Super Saiyan Blue', cmd: '=vegblue',              desc: 'Rob x1.8 + gains x1.5 pendant 8h · CD : 5j' },
      { name: '🛡️ Pride Shield',      cmd: '=pride',                desc: 'Renvoie 60% des attaques reçues pendant 6h · CD : 5j' },
      { name: '💥 Spirit Fission',    cmd: '=fission @user',        desc: 'Brise bouclier normal + rob x1.5 · CD : 5j' },
      { name: '😤 Ultra Ego',         cmd: '=ultraego',             desc: 'Plus tu reçois d\'attaques pendant 10h, plus ton prochain rob est fort (x1 à x3) · CD : 8j' },
      { name: '💀 Final Explosion',   cmd: '=finalexplosion @user', desc: 'Vole 15% wallet + 10% banque · Tu perds 5% de ton propre wallet · CD : 12j' },
    ],
  },

  luffy: {
    name: 'Monkey D. Luffy', anime: 'One Piece', tier: 'B', emoji: '🌊', role: '@Monkey D. Luffy',
    techniques: [
      { name: '👊 Gomu Gomu no Pistol', cmd: '=pistol @user',     desc: 'Rob x1.2 · CD : 3h' },
      { name: '⚡ Gear Second',          cmd: '=gear2',            desc: 'Ignore les counter-rob + rob x1.5 pendant 6h · CD : 2j' },
      { name: '💪 Gear Third',           cmd: '=gear3 @user',     desc: 'Rob x2 usage unique · CD : 2j' },
      { name: '🔴 Red Hawk',             cmd: '=redhawk @user',   desc: 'Rob x1.8 + brûle 3% du wallet de la cible · CD : 1j' },
      { name: '🥊 Kong Organ',           cmd: '=kongorgan @user', desc: '3 tentatives de rob, garde le meilleur résultat · CD : 3j' },
      { name: '🛡️ Armament Haki',       cmd: '=haki',            desc: 'Réduit tes pertes de rob de 40% pendant 8h · CD : 3j' },
      { name: '🔵 Gear Fourth',          cmd: '=gear4',           desc: 'Bouclier 12h + renvoie 40% des coins volés à l\'attaquant · CD : 5j' },
      { name: '⚫ Conqueror\'s Haki',    cmd: '=chaki @user',     desc: 'KO la cible 5 min (bloque ses commandes) · CD : 5j' },
      { name: '🌀 Gear Fifth',           cmd: '=gear5',           desc: 'Immunité 6h + rob x1.8 + gains x1.5 · Débloque =bajrang · CD : 12j' },
      { name: '☄️ Bajrang Gun',          cmd: '=bajrang @user',   desc: 'Vole 12% wallet + 8% banque · Brise boucliers normaux · Nécessite Gear Fifth actif · CD : 10j' },
    ],
  },

  zoro: {
    name: 'Roronoa Zoro', anime: 'One Piece', tier: 'B', emoji: '⚔️', role: '@Roronoa Zoro',
    techniques: [
      { name: '🗡️ Oni Giri',         cmd: '=onigiri @user',      desc: 'Rob x1.2 · CD : 3h' },
      { name: '⚔️ Santoryu',         cmd: '=santoryu @user',     desc: 'Rob x1.5 + brise bouclier basique · CD : 1j' },
      { name: '🐯 Tora Gari',        cmd: '=toragari @user',     desc: 'Rob x1.8 + bloque le counter-rob de la cible 30min · CD : 1j' },
      { name: '🗡️ Shishi Sonson',    cmd: '=shishi @user',       desc: 'Rob x2 + vole 4% de la banque · CD : 2j' },
      { name: '🔇 Stealth',          cmd: '=stealth',            desc: 'Ton prochain rob n\'envoie aucune notification à la cible · CD : 2j' },
      { name: '💫 1080 Pound Canon', cmd: '=poundcanon @user',   desc: 'Brise boucliers normaux · Pas Cache Heian ni Infini · CD : 4j' },
      { name: '⚫ Black Blade',       cmd: '=blackblade @user',   desc: 'Rob x2 · Ignore anti-rob basiques · CD : 4j' },
      { name: '👁️ Ashura',           cmd: '=ashura',             desc: 'Rob x2.5 + immunité contre-attaque pendant 6h · CD : 7j' },
      { name: '👑 King of Hell',      cmd: '=kingofhell',         desc: 'Immunité 8h + renvoie 50% des attaques · CD : 7j' },
      { name: '🌑 Supreme Blade',     cmd: '=supremeblade @user', desc: 'Vole 12% wallet + 6% banque · Brise boucliers normaux · CD : 10j' },
    ],
  },

  levi: {
    name: 'Levi Ackerman', anime: 'Attack on Titan', tier: 'C', emoji: '⚔️', role: '@Levi Ackerman',
    techniques: [
      { name: '🗡️ Thunder Spear',         cmd: '=thunderspear @user', desc: 'Rob x1.2 + brise bouclier basique · CD : 6h' },
      { name: '🔄 3DMG',                  cmd: '=3dmg',               desc: 'Esquive la prochaine attaque reçue + renvoie 20% à l\'attaquant · CD : 12h' },
      { name: '🔇 Stealth Strike',         cmd: '=stealthstrike @user',desc: 'Rob x1.3 sans notification à la cible · CD : 12h' },
      { name: '🗡️ Titan Killer',          cmd: '=titankill @user',    desc: 'Brise le bouclier anti-rob basique de la cible · CD : 2j' },
      { name: '🌀 Spin Attack',            cmd: '=spinattack @user',   desc: 'Rob x1.5 + stun 5 min · CD : 2j' },
      { name: '⚡ Ackerman Awakening',     cmd: '=ackerman',           desc: 'Rob x1.8 pendant 8h · CD : 4j' },
      { name: '🛡️ Survey Corps Formation',cmd: '=formation',          desc: 'Bouclier 8h + counter-rob actif (voleur perd 10%) · CD : 5j' },
      { name: '💪 No Mercy',              cmd: '=nomercy @user',      desc: 'Rob x2 + brise bouclier basique + stun 5 min · CD : 7j' },
      { name: '⚰️ Last Stand',            cmd: '=laststand @user',    desc: 'Rob x2.5 · Cooldown 14j si échec · CD : 8j' },
    ],
  },

  killua: {
    name: 'Killua Zoldyck', anime: 'Hunter x Hunter', tier: 'C', emoji: '⚡', role: '@Killua Zoldyck',
    techniques: [
      { name: '⚡ Lightning Palm',       cmd: '=lightningpalm @user',  desc: 'Rob x1.2 · CD : 3h' },
      { name: '🔪 Narukami',            cmd: '=narukami @user',       desc: 'Aspire 5k–15k du wallet de la cible · CD : 8h' },
      { name: '💨 Rhythm Echo',         cmd: '=rhythmecho',           desc: 'Esquive la prochaine attaque reçue + renvoie 15% à l\'attaquant · CD : 12h' },
      { name: '🌑 Stealth Mode',        cmd: '=stealthmode @user',    desc: 'Rob x1.3 sans notification à la cible · CD : 1j' },
      { name: '⚡ Thunderbolt',         cmd: '=thunderbolt @user',    desc: 'Rob x1.5 + stun 5 min · CD : 2j' },
      { name: '🗡️ Yo-Yo',              cmd: '=yoyo @user',           desc: 'Brise le bouclier basique de la cible · CD : 2j' },
      { name: '🛡️ Pin Shield',         cmd: '=pinshield',            desc: 'Bouclier 6h + counter-rob actif (voleur perd 8%) · CD : 4j' },
      { name: '💀 Silent Kill',         cmd: '=silentkill @user',     desc: 'Rob x1.8 + brise bouclier basique + sans notification · CD : 5j' },
      { name: '⚡ Godspeed',            cmd: '=godspeed',             desc: 'Rob x2.5 usage unique + esquive la prochaine attaque · CD : 8j' },
    ],
  },

  light: {
    name: 'Light Yagami', anime: 'Death Note', tier: 'A', emoji: '📓', role: '@Light Yagami',
    techniques: [
      { name: '👁️ Shinigami Eyes',    cmd: '=shinigami @user',  desc: 'Révèle le wallet + banque exact de la cible (visible que par toi) · CD : 12h' },
      { name: '💸 Hidden Agenda',     cmd: '=agenda @user',     desc: 'Vole 3k directement, sans rob classique · CD : 12h' },
      { name: '😈 Kira\'s Judgment',  cmd: '=kira @user',       desc: 'Réduit les gains de la cible de 40% pendant 12h · CD : 5j' },
      { name: '📓 Death Note',        cmd: '=deathnote @user',  desc: 'Ban casino pendant 24h · CD : 5j' },
      { name: '🧠 Superior Intellect',cmd: '=intellect',        desc: 'Immunité contre Death Note + Kira pendant 24h · CD : 5j' },
      { name: '⚡ God Complex',        cmd: '=godcomplex',       desc: 'Gains x1.3 pendant 12h + immunité Kira · CD : 4j' },
      { name: '🔄 L\'s Nemesis',      cmd: '=nemesis @user',    desc: 'Renvoie l\'effet Kira actif sur la cible à son expéditeur · CD : 3j' },
      { name: '🎭 Near the End',      cmd: '=near @user',       desc: 'Brise bouclier basique + Kira 24h + ban casino 12h · CD : 10j' },
      { name: '🌍 World Domination',  cmd: '=worlddom @user',   desc: 'Vole 8% wallet + applique Kira + ban casino 24h · Ignore boucliers basiques · CD : 12j' },
    ],
  },
};

// Alias pour retrouver un perso peu importe comment on écrit le nom
const ALIASES = {
  gojo: 'gojo', satoru: 'gojo',
  sukuna: 'sukuna', ryomen: 'sukuna',
  saitama: 'saitama',
  goku: 'goku', 'son goku': 'goku',
  naruto: 'naruto',
  vegeta: 'vegeta',
  luffy: 'luffy', 'monkey d. luffy': 'luffy', 'monkey d luffy': 'luffy',
  zoro: 'zoro', roronoa: 'zoro',
  levi: 'levi', 'levi ackerman': 'levi',
  killua: 'killua', 'killua zoldyck': 'killua',
  light: 'light', 'light yagami': 'light', kira: 'light',
};

function buildEmbeds(perso) {
  const color = TIER_COLORS[perso.tier];
  const embeds = [];

  // Premier embed : header + techniques 1 à 5
  const e1 = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${perso.emoji} ${perso.name}`)
    .addFields(
      { name: 'Anime',       value: perso.anime,            inline: true },
      { name: 'Tier',        value: TIER_LABELS[perso.tier],inline: true },
      { name: 'Rôle requis', value: perso.role,             inline: true },
    );

  const chunk1 = perso.techniques.slice(0, 5);
  for (const t of chunk1)
    e1.addFields({ name: t.name, value: `\`${t.cmd}\`\n${t.desc}`, inline: false });
  embeds.push(e1);

  // Deuxième embed si plus de 5 techniques
  const chunk2 = perso.techniques.slice(5);
  if (chunk2.length) {
    const e2 = new EmbedBuilder().setColor(color).setTitle(`${perso.emoji} ${perso.name} — suite`);
    for (const t of chunk2)
      e2.addFields({ name: t.name, value: `\`${t.cmd}\`\n${t.desc}`, inline: false });
    embeds.push(e2);
  }

  return embeds;
}

// =persos — liste tous les persos
function buildListEmbed() {
  const tiers = { S: [], A: [], B: [], C: [] };
  for (const p of Object.values(PERSOS)) tiers[p.tier].push(p);

  return new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle('⚔️ Personnages disponibles')
    .addFields(
      { name: TIER_LABELS.S, value: tiers.S.map(p => `${p.emoji} **${p.name}** — ${p.anime}`).join('\n'), inline: false },
      { name: TIER_LABELS.A, value: tiers.A.map(p => `${p.emoji} **${p.name}** — ${p.anime}`).join('\n'), inline: false },
      { name: TIER_LABELS.B, value: tiers.B.map(p => `${p.emoji} **${p.name}** — ${p.anime}`).join('\n'), inline: false },
      { name: TIER_LABELS.C, value: tiers.C.map(p => `${p.emoji} **${p.name}** — ${p.anime}`).join('\n'), inline: false },
    )
    .setFooter({ text: 'Utilise =attaques <nom> pour voir les techniques d\'un personnage' });
}

// ─── Helpers données personnages ────────────────────────────
function getCharData(user) {
  if (!user.characters) user.characters = { owned: [], equipped: null, cooldowns: {}, activeEffects: {} };
  if (!user.characters.owned)        user.characters.owned        = [];
  if (!user.characters.cooldowns)    user.characters.cooldowns    = {};
  if (!user.characters.activeEffects)user.characters.activeEffects= {};
  return user.characters;
}

function formatRemaining(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${Math.max(1, m)}min`;
}

function buildCdEmbeds(ownedKeys, charData) {
  const now = Date.now();
  return ownedKeys.map(key => {
    const perso = PERSOS[key];
    if (!perso) return null;

    const lines = perso.techniques.map(t => {
      const cmdKey = t.cmd.replace('=', '').split(' ')[0];
      const activeTs = charData.activeEffects?.[cmdKey];
      const cdTs     = charData.cooldowns?.[cmdKey];

      let status;
      if (activeTs && activeTs > now)
        status = `🟢 **ACTIF** — ${formatRemaining(activeTs - now)}`;
      else if (cdTs && cdTs > now)
        status = `⏳ CD — ${formatRemaining(cdTs - now)}`;
      else
        status = '✅ Dispo';

      return `${t.name} · ${status}`;
    });

    const isEquipped = charData.equipped === key;
    return new EmbedBuilder()
      .setColor(TIER_COLORS[perso.tier])
      .setTitle(`${perso.emoji} ${perso.name}${isEquipped ? ' · ⚔️ Équipé' : ''}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Tier ${perso.tier} — ${perso.anime}` });
  }).filter(Boolean);
}

// ─── Boutique ────────────────────────────────────────────────
const SHOP_PRICES = { S: 5_000_000, A: 2_000_000, B: 800_000, C: 450_000 };

function fmtCoins(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return Math.round(n / 1_000) + 'K';
  return n.toString();
}

function buildShopEmbed(ownedKeys = []) {
  const tiers = { S: [], A: [], B: [], C: [] };
  for (const [key, p] of Object.entries(PERSOS)) tiers[p.tier].push({ key, ...p });

  const fields = Object.entries(tiers).map(([tier, list]) => ({
    name: TIER_LABELS[tier],
    value: list.map(p => {
      const owned = ownedKeys.includes(p.key);
      return `${p.emoji} **${p.name}** — ${owned ? '✅ Possédé' : `🪙 ${fmtCoins(SHOP_PRICES[tier])}`}`;
    }).join('\n'),
    inline: false,
  }));

  return new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle('🛒 Boutique — Personnages')
    .addFields(fields)
    .setFooter({ text: 'Utilise =acheter <nom> pour acheter un personnage' });
}

module.exports = {
  // Exports partagés pour la slash command /boutique-persos
  PERSOS, ALIASES, TIER_COLORS, TIER_LABELS, SHOP_PRICES, fmtCoins, getCharData,

  init(client) {
    client.on('messageCreate', async msg => {
      if (msg.author.bot || !msg.guild) return;
      const content = msg.content.trim();
      if (!content.startsWith(PREFIX)) return;

      const [cmd, ...args] = content.slice(1).trim().split(/\s+/);
      const name = cmd.toLowerCase();

      // =persos — liste
      if (name === 'persos') {
        return msg.reply({ embeds: [buildListEmbed()] });
      }

      // =shop — boutique des personnages
      if (name === 'shop') {
        const user     = getUser(msg.author.id);
        const charData = getCharData(user);
        return msg.reply({ embeds: [buildShopEmbed(charData.owned)] });
      }

      // =acheter <perso>
      if (name === 'acheter') {
        const query = args.join(' ').toLowerCase().trim();
        if (!query) return msg.reply('❌ Utilise : `=acheter <nom du personnage>`');

        const key = ALIASES[query];
        if (!key) return msg.reply('❌ Personnage inconnu. Utilise `=shop` pour voir la liste.');

        const user     = getUser(msg.author.id);
        const charData = getCharData(user);

        if (charData.owned.includes(key))
          return msg.reply(`❌ Tu possèdes déjà **${PERSOS[key].name}**.`);

        const perso = PERSOS[key];
        const price = SHOP_PRICES[perso.tier];

        if (user.wallet < price)
          return msg.reply({ embeds: [new EmbedBuilder()
            .setColor(0xff4444)
            .setDescription(`❌ Tu n'as pas assez d'argent.\n🪙 Prix : **${fmtCoins(price)}** · Ton wallet : **${fmtCoins(user.wallet)}**`)
          ]});

        user.wallet -= price;
        charData.owned.push(key);
        saveUser(user);

        return msg.reply({ embeds: [new EmbedBuilder()
          .setColor(TIER_COLORS[perso.tier])
          .setTitle('✅ Achat confirmé !')
          .setDescription(`Tu as acheté **${perso.emoji} ${perso.name}** pour **${fmtCoins(price)}** 🪙\nUtilise \`=equiper ${query}\` pour l'équiper.`)
          .setFooter({ text: `Solde restant : ${fmtCoins(user.wallet)} coins` })
        ]});
      }

      // =cd — cooldowns de tous tes persos
      if (name === 'cd') {
        const user     = getUser(msg.author.id);
        const charData = getCharData(user);

        if (!charData.owned.length)
          return msg.reply('❌ Tu ne possèdes aucun personnage. Obtiens-en via les boîtes mystérieuses ou la boutique.');

        const embeds = buildCdEmbeds(charData.owned, charData);
        return msg.reply({ embeds });
      }

      // =equiper <perso>
      if (name === 'equiper') {
        const query = args.join(' ').toLowerCase().trim();
        if (!query) return msg.reply('❌ Utilise : `=equiper <nom du personnage>`');

        const key = ALIASES[query];
        if (!key) return msg.reply('❌ Personnage inconnu. Utilise `=persos` pour voir la liste.');

        const user     = getUser(msg.author.id);
        const charData = getCharData(user);

        if (!charData.owned.includes(key))
          return msg.reply(`❌ Tu ne possèdes pas **${PERSOS[key].name}**.`);

        charData.equipped = key;
        saveUser(user);

        const perso = PERSOS[key];
        return msg.reply({ embeds: [new EmbedBuilder()
          .setColor(TIER_COLORS[perso.tier])
          .setTitle('⚔️ Personnage équipé')
          .setDescription(`Tu as équipé **${perso.emoji} ${perso.name}** !`)
        ]});
      }

      // =admindonnerperso @user <perso> — admin only
      if (name === 'admindonnerperso') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const target = msg.mentions.members.first();
        if (!target) return msg.reply('❌ Mentionne un utilisateur. Ex : `=admindonnerperso @user zoro`');

        const query = args.slice(1).join(' ').toLowerCase().trim();
        const key   = ALIASES[query];
        if (!key) return msg.reply('❌ Personnage inconnu. Utilise `=persos` pour voir la liste.');

        const user     = getUser(target.id);
        const charData = getCharData(user);

        if (charData.owned.includes(key))
          return msg.reply(`❌ **${target.displayName}** possède déjà **${PERSOS[key].name}**.`);

        charData.owned.push(key);
        saveUser(user);

        const perso = PERSOS[key];
        return msg.reply({ embeds: [new EmbedBuilder()
          .setColor(TIER_COLORS[perso.tier])
          .setTitle('✅ Personnage donné')
          .setDescription(`**${perso.emoji} ${perso.name}** a été ajouté à l'inventaire de **${target.displayName}** !`)
        ]});
      }

      // =adminretirerperso @user <perso> — admin only
      if (name === 'adminretirerperso') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const target = msg.mentions.members.first();
        if (!target) return msg.reply('❌ Mentionne un utilisateur. Ex : `=adminretirerperso @user zoro`');

        const query = args.slice(1).join(' ').toLowerCase().trim();
        const key   = ALIASES[query];
        if (!key) return msg.reply('❌ Personnage inconnu.');

        const user     = getUser(target.id);
        const charData = getCharData(user);

        if (!charData.owned.includes(key))
          return msg.reply(`❌ **${target.displayName}** ne possède pas **${PERSOS[key].name}**.`);

        charData.owned = charData.owned.filter(k => k !== key);
        if (charData.equipped === key) charData.equipped = null;
        saveUser(user);

        const perso = PERSOS[key];
        return msg.reply({ embeds: [new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle('🗑️ Personnage retiré')
          .setDescription(`**${perso.emoji} ${perso.name}** a été retiré de l'inventaire de **${target.displayName}**.`)
        ]});
      }

      // =adminlisterpersos @user — admin only
      if (name === 'adminlisterpersos') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const target = msg.mentions.members.first();
        if (!target) return msg.reply('❌ Mentionne un utilisateur. Ex : `=adminlisterpersos @user`');

        const user     = getUser(target.id);
        const charData = getCharData(user);

        if (!charData.owned.length)
          return msg.reply(`❌ **${target.displayName}** ne possède aucun personnage.`);

        const lines = charData.owned.map(k => {
          const p = PERSOS[k];
          if (!p) return `❓ ${k}`;
          const equipped = charData.equipped === k ? ' · ⚔️ Équipé' : '';
          return `${p.emoji} **${p.name}** [Tier ${p.tier}]${equipped}`;
        });

        return msg.reply({ embeds: [new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle(`📋 Personnages de ${target.displayName}`)
          .setDescription(lines.join('\n'))
        ]});
      }

      // =attaques <nom>
      if (name === 'attaques') {
        const query = args.join(' ').toLowerCase().trim();
        if (!query) {
          return msg.reply({ embeds: [buildListEmbed()] });
        }
        const key = ALIASES[query];
        if (!key || !PERSOS[key]) {
          return msg.reply(`❌ Personnage inconnu. Utilise \`=persos\` pour voir la liste.`);
        }
        const embeds = buildEmbeds(PERSOS[key]);
        return msg.reply({ embeds });
      }
    });

    console.log('[Persos] ✅ =persos · =attaques · =cd · =equiper · =shop · =acheter · =admindonnerperso · =adminretirerperso · =adminlisterpersos');
  },
};
