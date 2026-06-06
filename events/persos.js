'use strict';
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, saveUser } = require('../levels/db');
const B = require('../levels/buffs');

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

function buildCdEmbed(member, ownedKeys, charData) {
  const now = Date.now();
  let anyCooldown = false;

  // Couleur de cercle par tier
  const TIER_CIRCLE = { S: '🟡', A: '🟠', B: '🔵', C: '🟢' };

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setFooter({ text: '✅ Disponible · ⏳ En cooldown · Seuls les pouvoirs possédés sont affichés · Aujourd\'hui à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })
    .setAuthor({ name: `🎮 Cooldowns — ${member.displayName}`, iconURL: member.displayAvatarURL({ size: 64 }) });

  for (const key of ownedKeys) {
    const perso = PERSOS[key];
    if (!perso) continue;

    const lines = perso.techniques.map(t => {
      const cmdKey = t.cmd.replace('=', '').split(' ')[0];
      const cdTs   = charData.cooldowns?.[cmdKey];

      if (cdTs && cdTs > now) {
        anyCooldown = true;
        return `⏳ ${t.name} — **${formatRemaining(cdTs - now)}**`;
      }
      return `✅ ${t.name} — Disponible`;
    });

    const isEquipped = charData.equipped === key;
    const circle = TIER_CIRCLE[perso.tier] || '⚪';
    const fieldName = `${circle} ${perso.name}${isEquipped ? ' ⚔️' : ''}`;

    // Discord field value limit = 1024 chars ; chunk si nécessaire
    const fullValue = lines.join('\n');
    if (fullValue.length <= 1024) {
      embed.addFields({ name: fieldName, value: fullValue, inline: false });
    } else {
      const half = Math.ceil(lines.length / 2);
      embed.addFields(
        { name: fieldName,        value: lines.slice(0, half).join('\n'), inline: true },
        { name: '​',         value: lines.slice(half).join('\n'),    inline: true },
      );
    }
  }

  embed.setDescription(
    anyCooldown
      ? `🔴 Certaines techniques de **${member.displayName}** sont encore en recharge\n> `
      : `🟢 Toutes les techniques de **${member.displayName}** sont disponibles\n> `
  );

  return embed;
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

// ─── Constantes cooldown ──────────────────────────────────────
const H = 3600_000;
const J = 86_400_000;
const CD_MS = {
  '3h':3*H,'4h':4*H,'5h':5*H,'6h':6*H,'8h':8*H,'12h':12*H,
  '1j':J,'2j':2*J,'3j':3*J,'4j':4*J,'5j':5*J,'6j':6*J,'7j':7*J,
  '8j':8*J,'9j':9*J,'10j':10*J,'12j':12*J,'14j':14*J,'15j':15*J,'20j':20*J,
};

// ─── Map cmd → persoKey ─────────────────────────────────────
const ATTACK_MAP = (() => {
  const m = {};
  for (const [key, p] of Object.entries(PERSOS))
    for (const t of p.techniques)
      m[t.cmd.replace('=', '').split(' ')[0]] = key;
  return m;
})();

// ─── Helpers ─────────────────────────────────────────────────
function fmtC(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return Math.round(n / 1_000) + 'K';
  return n.toLocaleString('fr-FR');
}
function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function setCD(charData, cmd, ms) { charData.cooldowns[cmd] = Date.now() + ms; }

const SHIELD_LVL = { basic: 1, heian: 2, infini: 3 };
const IGN_LVL    = { basic: 1, heian: 2, infini: 3, all: 3 };

// Vérifie bouclier/immunité et renvoie { blocked: type } ou null
// ignoreLevel 'basic'|'heian'|'infini' — niveau de bypass
// breakLevel  'basic'|'heian'|'infini' — niveau à briser (en + du bypass)
function shieldCheck(victim, ignoreLevel, breakLevel) {
  const shield = B.getShield(victim);
  if (!shield) return null;
  const sLvl = SHIELD_LVL[shield.type] || 1;
  const iLvl = IGN_LVL[ignoreLevel]    || 0;
  if (iLvl < sLvl) return { blocked: shield.type };
  if (breakLevel) {
    const bLvl = IGN_LVL[breakLevel] || 0;
    if (bLvl >= sLvl) {
      B.clearBuff(victim, 'shield');
      saveUser(victim);
    }
  }
  return null;
}

// Rob standard avec multiplicateur — renvoie { stolen } ou { blocked } ou { empty }
function doRob(attUser, victim, mult = 1, opts = {}) {
  // opts: ignoreLevel, breakLevel, ignoreCounter, ignoreImmune
  if (!opts.ignoreImmune && B.isImmune(victim))
    return { blocked: 'infini' };

  const sc = shieldCheck(victim, opts.ignoreLevel, opts.breakLevel);
  if (sc) return sc;

  if (victim.wallet <= 0) return { empty: true };

  const pct = 0.10 + Math.random() * 0.20;
  let stolen = Math.max(1, Math.floor(victim.wallet * pct * mult));

  // reduceLoss (=haki)
  if (!opts.ignoreCounter && victim.buffs?.reduceLoss?.exp > Date.now()) {
    stolen = Math.floor(stolen * (1 - victim.buffs.reduceLoss.v));
  }

  // absorb (gear4, pride, counterRob)
  if (!opts.ignoreCounter) {
    if (victim.buffs?.absorb?.exp > Date.now()) {
      const back = Math.floor(stolen * victim.buffs.absorb.v);
      attUser.wallet = Math.max(0, attUser.wallet - back);
      victim.wallet += back;
    } else if (victim.buffs?.counterRob?.exp > Date.now()) {
      const back = Math.floor(stolen * victim.buffs.counterRob.v);
      attUser.wallet = Math.max(0, attUser.wallet - back);
      victim.wallet += back;
    }
  }

  stolen = Math.min(stolen, victim.wallet);
  victim.wallet -= stolen;
  attUser.wallet += stolen;
  saveUser(victim);
  return { stolen };
}

// ─── Dispatch principal des attaques ──────────────────────────
async function handleAttack(msg, args, name, attUser, attChar) {
  const COIN = '<:49c1a23b876841ce87e5aa7dbeacada9:1510067105767227423>';
  function re(color, desc) { return { embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] }; }
  function ok(desc)  { return re(0x22c55e, desc); }
  function err(desc) { return re(0xef4444, desc); }
  function cd(desc)  { return re(0xf59e0b, desc); }

  const target = msg.mentions.members.first();
  const targetUser = target ? getUser(target.id) : null;
  const tName  = target?.displayName ?? '???';

  function needTarget() {
    if (!target) { msg.reply(err('❌ Mentionne une cible. Ex : `=' + name + ' @membre`')); return true; }
    if (target.id === msg.author.id) { msg.reply(err('❌ Tu ne peux pas te cibler toi-même.')); return true; }
    return false;
  }
  function blocked(type) {
    if (type === 'infini') return msg.reply(cd('♾️ **' + tName + '** est protégé(e) par l\'Infini — attaque impossible !'));
    if (type === 'heian')  return msg.reply(cd('🛡️ **' + tName + '** a un bouclier Heian actif !'));
    return msg.reply(cd('🛡️ **' + tName + '** a un bouclier actif — attaque bloquée !'));
  }
  function robResult(res, successMsg, failEmptyMsg) {
    if (res.blocked) return blocked(res.blocked);
    if (res.empty)   return msg.reply(cd('💸 **' + tName + '** n\'a rien sur lui !'));
    if (failEmptyMsg && res.stolen === 0) return msg.reply(cd(failEmptyMsg));
    return msg.reply(ok(successMsg.replace('{n}', fmtC(res.stolen))));
  }

  const now = Date.now();
  const heian = attChar.equipped === 'sukuna' && attUser.buffs?.heianForm?.exp > now;

  switch (name) {

    // ══════════════════════════════════════════════
    //  GOJO SATORU
    // ══════════════════════════════════════════════

    case 'blue': {
      if (needTarget()) return;
      if (!attUser.buffs?.awak?.exp > now ? false : false); // awak boost: +50% range
      const awakBoost = attUser.buffs?.awak?.exp > now;
      const [lo, hi] = awakBoost ? [15000, 45000] : [10000, 30000];
      const amt = rand(lo, hi);
      const actual = Math.min(amt, targetUser.bank || 0);
      if (actual <= 0) return msg.reply(cd('💸 La banque de **' + tName + '** est vide.'));
      targetUser.bank -= actual;
      attUser.wallet  += actual;
      saveUser(targetUser);
      setCD(attChar, name, CD_MS['8h']); saveUser(attUser);
      return msg.reply(ok(`🔵 **Blue** — Tu as aspiré **${fmtC(actual)}** ${COIN} de la banque de **${tName}** !`));
    }

    case 'bluemax': {
      B.setGFX(msg.guild.id, 'bluemax', { userId: msg.author.id, channel: msg.channel.id }, 30_000);
      setCD(attChar, name, CD_MS['1j']); saveUser(attUser);
      return msg.reply(ok('🔵 **Blue Max** — Tu interceptes tous les gains éco du salon pendant **30 secondes** !'));
    }

    case 'red': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const sc = shieldCheck(targetUser, null, 'basic');
      if (sc && sc.blocked) { /* shield broken on target, continue */ }
      B.setBuff(attUser, 'counterRob', { exp: now + 10 * 60_000, v: 0.10 });
      saveUser(attUser);
      const shieldMsg = B.getShield(targetUser) ? '' : '';
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      setCD(attChar, name, CD_MS['3h']); saveUser(attUser);
      return msg.reply(ok(`🔴 **Red** — Bouclier de **${tName}** brisé + counter-rob actif 10min (tout voleur perd 10%) !`));
    }

    case 'redmax': {
      if (needTarget()) return;
      if (B.isImmune(targetUser) && targetUser.buffs?.shield?.type === 'infini') return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      B.setBuff(attUser, 'absorb',    { exp: now + 10 * 60_000, v: 0.20 });
      B.setBuff(attUser, 'gainMult',  { exp: now + 10 * 60_000, v: 1.30 });
      saveUser(attUser);
      setCD(attChar, name, CD_MS['8h']); saveUser(attUser);
      return msg.reply(ok(`🔴 **Red Max** — Tous les boucliers de **${tName}** brisés + counter-tout 10min (attaquant perd 20%, toi +30%) !`));
    }

    case 'violet': {
      if (needTarget()) return;
      if (targetUser.buffs?.casinoImmune?.exp > now) return msg.reply(cd(`🛡️ **${tName}** est immunisé(e) aux bans casino !`));
      const dur = [1*H, 2*H, 4*H][Math.floor(Math.random() * 3)];
      B.setBuff(targetUser, 'casinoBan', { exp: now + dur, from: msg.author.id });
      saveUser(targetUser);
      setCD(attChar, name, CD_MS['3j']); saveUser(attUser);
      return msg.reply(ok(`🟣 **Violet** — **${tName}** est banni(e) du casino pendant **${B.fmtT(now + dur)}** !`));
    }

    case 'territoire': {
      B.setGFX(msg.guild.id, 'territoire', { userId: msg.author.id, channel: msg.channel.id }, 5 * 60_000);
      setCD(attChar, name, CD_MS['9j']); saveUser(attUser);
      return msg.reply(ok('🏴 **Infinite Void** — Tu contrôles le salon ! Seul toi reçois les gains éco pendant **5 minutes** !'));
    }

    case 'infini': {
      B.setBuff(attUser, 'shield', { exp: now + 12*H, type: 'infini' });
      setCD(attChar, name, CD_MS['1j']); saveUser(attUser);
      return msg.reply(ok('♾️ **Infini** — Protection absolue 12h ! Seuls Sukuna (=worldslash) et Saitama (=seriouspunch) peuvent te toucher.'));
    }

    case 'awak': {
      B.setBuff(attUser, 'awak', { exp: now + 24*H });
      B.setBuff(attUser, 'gainMult', { exp: now + 24*H, v: 1.5 });
      setCD(attChar, name, CD_MS['12j']); saveUser(attUser);
      return msg.reply(ok('🌟 **Éveil** — Mode Dieu 24h ! Toutes tes techniques sont boostées. Débloque `=lastblue` et `=lastred`.'));
    }

    case 'lastblue': {
      if (!attUser.buffs?.awak?.exp > now) return msg.reply(err('❌ **Éveil** doit être actif pour utiliser cette technique.'));
      B.setBuff(attUser, 'immunity', { exp: now + 15 * 60_000 });
      B.setBuff(attUser, 'dodge',    true);
      setCD(attChar, name, CD_MS['4j']); saveUser(attUser);
      return msg.reply(ok('🌀 **Last Blue** — Tu absorbes toutes les attaques offensives + familiers pendant **15 minutes** !'));
    }

    case 'lastred': {
      if (!attUser.buffs?.awak?.exp > now) return msg.reply(err('❌ **Éveil** doit être actif pour utiliser cette technique.'));
      B.setBuff(attUser, 'absorb', { exp: now + 6 * 60_000, v: 1.0 });
      B.setGFX(msg.guild.id, 'lastred', { userId: msg.author.id, channel: msg.channel.id }, 6 * 60_000);
      setCD(attChar, name, CD_MS['4j']); saveUser(attUser);
      return msg.reply(ok('🌊 **Last Red** — Toutes les attaques renvoyées + KO 1min pour ceux qui parlent dans le salon pendant **6 minutes** !'));
    }

    // ══════════════════════════════════════════════
    //  RYOMEN SUKUNA
    // ══════════════════════════════════════════════

    case 'cleave': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const ignLvl = heian ? 'heian' : null;
      const sc2 = shieldCheck(targetUser, ignLvl, ignLvl || 'basic');
      if (sc2?.blocked && !ignLvl) return blocked(sc2.blocked);
      saveUser(targetUser);
      setCD(attChar, name, CD_MS['3h']); saveUser(attUser);
      const extraMsg = heian ? ' (Heian : boucliers améliorés inclus !)' : '';
      return msg.reply(ok(`⚔️ **Cleave** — Bouclier de **${tName}** brisé${extraMsg} !`));
    }

    case 'cache': {
      const dur = heian ? 9*H : 3*H;
      B.setBuff(attUser, 'shield', { exp: now + dur, type: heian ? 'heian' : 'basic' });
      setCD(attChar, name, CD_MS['8h']); saveUser(attUser);
      const durStr = heian ? '9h (Heian !)' : '3h';
      return msg.reply(ok(`🛡️ **Cache** — Anti-rob amélioré actif pendant **${durStr}** !`));
    }

    case 'spiderweb': {
      const n = heian ? 5 : 1;
      B.setGFX(msg.guild.id, 'spiderweb', { userId: msg.author.id, n }, J);
      setCD(attChar, name, CD_MS['1j']); saveUser(attUser);
      const nStr = heian ? '5 prochaines personnes (Heian !)' : 'prochaine personne';
      return msg.reply(ok(`🕷️ **SpiderWeb** — La ${nStr} qui parle sera stun 5min !`));
    }

    case 'dismantle': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const effects = [];
      // Break shield
      B.clearBuff(targetUser, 'shield');
      effects.push('bouclier brisé');
      // Malus gains -20%
      const kiraV = heian ? 0.30 : 0.20;
      B.setBuff(targetUser, 'kira', { exp: now + 12*H, v: kiraV, from: msg.author.id });
      effects.push(`-${kiraV*100}% gains 12h`);
      // Steal from bank
      if (heian) {
        const bankSteal = Math.floor((targetUser.bank || 0) * 0.20);
        targetUser.bank = Math.max(0, (targetUser.bank || 0) - bankSteal);
        attUser.wallet += bankSteal;
        effects.push(`-20% bank (${fmtC(bankSteal)} ${COIN})`);
      } else {
        const bankSteal = Math.floor((targetUser.bank || 0) * 0.10);
        targetUser.bank = Math.max(0, (targetUser.bank || 0) - bankSteal);
        attUser.wallet += bankSteal;
        effects.push(`-10% bank (${fmtC(bankSteal)} ${COIN})`);
      }
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      return msg.reply(ok(`💥 **Dismantle** sur **${tName}** : ${effects.join(' · ')} !`));
    }

    case 'transfo': {
      const collect = heian ? 24000 : 12000;
      const cdHrs   = heian ? 24*H  : 30*H;
      B.setBuff(attUser, 'gainMult', { exp: now + cdHrs, v: 1.0 });
      if (!attUser.collectTransfo) attUser.collectTransfo = {};
      attUser.collectTransfo.exp    = now + cdHrs;
      attUser.collectTransfo.amount = collect;
      setCD(attChar, name, CD_MS['3j']); saveUser(attUser);
      const formName = heian ? 'Heian Form (24k/24h)' : 'Réceptacle (12k/30h)';
      return msg.reply(ok(`🔄 **Transformation** — Forme **${formName}** activée ! Utilise \`=collecter\` pour récupérer tes coins.`));
    }

    case 'fuga': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      // Basé sur doigts (simplifié : 8-10 doigts = pallier aléatoire)
      const tier = rand(8, 10);
      const pcts  = { 8: 0.10, 9: 0.15, 10: 0.20 };
      const caps  = { 8: 100_000, 9: 150_000, 10: 200_000 };
      const pct   = pcts[tier], cap = caps[tier];
      const raw   = Math.floor((targetUser.bank || 0) * pct);
      const actual = Math.min(raw, cap, targetUser.bank || 0);
      if (actual <= 0) return msg.reply(cd(`💸 La banque de **${tName}** est vide.`));
      targetUser.bank -= actual;
      attUser.wallet  += actual;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['4j']); saveUser(attUser);
      return msg.reply(ok(`👹 **Fuga (${tier} doigts)** — Tu as volé **${fmtC(actual)}** ${COIN} de la banque de **${tName}** !`));
    }

    case 'extension': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      // Dismantle + Cleave
      const ignLvl2 = heian ? 'heian' : 'basic';
      B.clearBuff(targetUser, 'shield');
      B.setBuff(targetUser, 'kira', { exp: now + 12*H, v: 0.20, from: msg.author.id });
      const bSteal = Math.floor((targetUser.bank || 0) * 0.10);
      targetUser.bank = Math.max(0, (targetUser.bank || 0) - bSteal);
      attUser.wallet += bSteal;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['3j']); saveUser(attUser);
      return msg.reply(ok(`⚡ **Extension** sur **${tName}** : bouclier brisé · -20% gains · -${fmtC(bSteal)} bank !`));
    }

    case 'extension-all': {
      const domainActive = B.getGFX(msg.guild.id, 'domain');
      const members = await msg.guild.members.fetch().catch(() => new Map());
      let hit = 0;
      for (const [uid, m] of members) {
        if (m.user.bot || uid === msg.author.id) continue;
        const v = getUser(uid);
        if (domainActive && uid === domainActive.userId) continue; // Domain Simple protège
        if (heian || !B.isImmune(v)) {
          B.clearBuff(v, 'shield');
          B.setBuff(v, 'kira', { exp: now + 6*H, v: 0.15, from: msg.author.id });
          saveUser(v);
          hit++;
        }
      }
      setCD(attChar, name, CD_MS['12j']); saveUser(attUser);
      return msg.reply(ok(`💀 **Extension Zone** sur tout le salon — **${hit}** membres touchés (bouclier brisé · -15% gains 6h) !`));
    }

    case 'worldslash': {
      if (needTarget()) return;
      // Brise TOUT sans exception, y compris Infini
      B.clearBuff(targetUser, 'shield');
      B.clearBuff(targetUser, 'immunity');
      B.clearBuff(targetUser, 'dodge');
      const stolen = Math.floor((targetUser.wallet || 0) * 0.30);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - stolen);
      attUser.wallet += stolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['14j']); saveUser(attUser);
      return msg.reply(ok(`⚔️ **World Cutting Slash** — TOUT brisé sur **${tName}** + **${fmtC(stolen)}** ${COIN} volés !`));
    }

    case 'heian': {
      B.setBuff(attUser, 'heianForm', { exp: now + 12*H });
      B.setBuff(attUser, 'robMult',   { exp: now + 12*H, v: 1.5 });
      setCD(attChar, name, CD_MS['14j']); saveUser(attUser);
      return msg.reply(ok('👹 **Heian Form** — Toutes tes techniques sont boostées pendant **12h** !'));
    }

    case 'domain': {
      B.setGFX(msg.guild.id, 'domain', { userId: msg.author.id }, H);
      setCD(attChar, name, CD_MS['1j']); saveUser(attUser);
      return msg.reply(ok('🛡️ **Domain Simple** — Tu es protégé(e) contre Extension Zone et Infinite Void pendant **1h** !'));
    }

    // ══════════════════════════════════════════════
    //  SAITAMA
    // ══════════════════════════════════════════════

    case 'normalpunch': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const res = doRob(attUser, targetUser, 3.0, { ignoreLevel: 'heian', breakLevel: 'heian', ignoreCounter: true });
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return robResult(res, `👊 **Normal Punch** — Rob x3 sur **${tName}** : **{n}** ${COIN} volés !`);
    }

    case 'consecutivepunch': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      let best = 0;
      for (let i = 0; i < 3; i++) {
        const r = doRob({ wallet: 0 }, { wallet: targetUser.wallet, buffs: {} }, 2.0, { ignoreLevel: 'heian' });
        if (r.stolen && r.stolen > best) best = r.stolen;
      }
      if (best <= 0) return msg.reply(cd(`💸 **${tName}** n\'a rien sur lui !`));
      targetUser.wallet = Math.max(0, targetUser.wallet - best);
      attUser.wallet += best;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['7j']); saveUser(attUser);
      return msg.reply(ok(`👊👊 **Consecutive Normal Punches** sur **${tName}** : meilleur résultat = **${fmtC(best)}** ${COIN} volés !`));
    }

    case 'cape': {
      B.setBuff(attUser, 'dodge', true);
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return msg.reply(ok('🛡️ **Cape Shield** — Tu absorbes la prochaine attaque reçue !'));
    }

    case 'limitless': {
      B.setBuff(attUser, 'gainMult', { exp: now + 24*H, v: 2.0 });
      setCD(attChar, name, CD_MS['14j']); saveUser(attUser);
      return msg.reply(ok('♾️ **Limitless Potential** — Tous tes gains sont doublés pendant **24h** !'));
    }

    case 'tableflip': {
      if (needTarget()) return;
      if (targetUser.buffs?.casinoImmune?.exp > now) return msg.reply(cd(`🛡️ **${tName}** est immunisé(e) !`));
      B.setBuff(targetUser, 'casinoBan', { exp: now + 7*J, from: msg.author.id });
      B.setBuff(targetUser, 'gainDebuff', { exp: now + 24*H, v: 0.75, from: msg.author.id });
      saveUser(targetUser);
      setCD(attChar, name, CD_MS['15j']); saveUser(attUser);
      return msg.reply(ok(`🎰 **Serious Table Flip** — **${tName}** : ban casino 7j + -75% gains 24h !`));
    }

    case 'megaton': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const stolen = Math.floor((targetUser.wallet || 0) * 0.35);
      if (stolen <= 0) return msg.reply(cd(`💸 **${tName}** n\'a rien sur lui !`));
      targetUser.wallet -= stolen; attUser.wallet += stolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['10j']); saveUser(attUser);
      return msg.reply(ok(`💀 **Megaton Punch** — **35%** du wallet de **${tName}** : **${fmtC(stolen)}** ${COIN} volés !`));
    }

    case 'seriouspunch': {
      if (needTarget()) return;
      // Ignore ABSOLUMENT TOUT y compris Infini
      B.clearBuff(targetUser, 'shield');
      B.clearBuff(targetUser, 'immunity');
      const wStolen = Math.floor((targetUser.wallet || 0) * 0.40);
      const bStolen = Math.floor((targetUser.bank   || 0) * 0.30);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - wStolen);
      targetUser.bank   = Math.max(0, (targetUser.bank   || 0) - bStolen);
      attUser.wallet += wStolen + bStolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['20j']); saveUser(attUser);
      return msg.reply(ok(`☄️ **Serious Punch** — **${tName}** : **${fmtC(wStolen)}** wallet + **${fmtC(bStolen)}** bank = **${fmtC(wStolen+bStolen)}** ${COIN} !`));
    }

    // ══════════════════════════════════════════════
    //  SON GOKU
    // ══════════════════════════════════════════════

    case 'kaioken': {
      const awakBoost = attUser.buffs?.awak?.exp > now; // Gojo awak check irrelevant here
      const mult = 1.5, gainV = 1.5;
      B.setBuff(attUser, 'robMult',  { exp: now + 4*H, v: mult });
      B.setBuff(attUser, 'gainMult', { exp: now + 4*H, v: gainV });
      setCD(attChar, name, CD_MS['4h']); saveUser(attUser);
      return msg.reply(ok('🟡 **Kaioken** — Rob x1.5 + gains +50% pendant **4h** !'));
    }

    case 'kaiokenx10': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      B.setBuff(attUser, 'robMult', { exp: now + 8*H, v: 2.5 });
      const res = doRob(attUser, targetUser, 2.5, { ignoreLevel: 'basic', breakLevel: 'basic' });
      setCD(attChar, name, CD_MS['1j']); saveUser(attUser);
      return robResult(res, `🟡 **Kaioken x10** — Bouclier brisé + **{n}** ${COIN} volés sur **${tName}** !`);
    }

    case 'kamehameha': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const amt = rand(15000, 40000);
      const stolen = Math.min(amt, targetUser.wallet || 0);
      if (stolen <= 0) return msg.reply(cd(`💸 **${tName}** n\'a rien sur lui !`));
      targetUser.wallet -= stolen; attUser.wallet += stolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['8h']); saveUser(attUser);
      return msg.reply(ok(`🔵 **Kamehameha** — **${fmtC(stolen)}** ${COIN} aspirés du wallet de **${tName}** !`));
    }

    case 'ssj': {
      B.setBuff(attUser, 'robMult',       { exp: now + 6*H, v: 2.0 });
      B.setBuff(attUser, 'ignoreCounter', { exp: now + 6*H });
      setCD(attChar, name, CD_MS['3j']); saveUser(attUser);
      return msg.reply(ok('⚡ **Super Saiyan** — Rob x2 + immunité counter-attaque pendant **6h** !'));
    }

    case 'ssjblue': {
      B.setBuff(attUser, 'robMult',  { exp: now + 12*H, v: 2.5 });
      B.setBuff(attUser, 'gainMult', { exp: now + 12*H, v: 2.0 });
      B.setBuff(attUser, 'ssjBlue',  { exp: now + 12*H });
      setCD(attChar, name, CD_MS['7j']); saveUser(attUser);
      return msg.reply(ok('💙 **Super Saiyan Blue** — Rob x2.5 + gains x2 **12h** ! Débloque `=ssjblue2`.'));
    }

    case 'ssjblue2': {
      if (!attUser.buffs?.ssjBlue?.exp > now) return msg.reply(err('❌ **SSJ Blue** doit être actif pour utiliser cette technique.'));
      B.setBuff(attUser, 'immunity',      { exp: now + 12*H });
      B.setBuff(attUser, 'robMult',       { exp: now + 12*H, v: 3.0 });
      B.setBuff(attUser, 'ignoreCounter', { exp: now + 12*H });
      setCD(attChar, name, CD_MS['10j']); saveUser(attUser);
      return msg.reply(ok('💙 **SSJ Blue Évolué** — Immunité 12h + rob x3 + brise Cache Heian !'));
    }

    case 'instant': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const silent = true;
      const res = doRob(attUser, targetUser, 1.5, { ignoreLevel: 'basic', ignoreCounter: true });
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      if (res.blocked) return blocked(res.blocked);
      if (res.empty)   return msg.reply(cd(`💸 **${tName}** n\'a rien sur lui !`));
      return msg.reply(ok(`🌀 **Instant Transmission** — Rob furtif : **${fmtC(res.stolen)}** ${COIN} volés à **${tName}** sans notification !`));
    }

    case 'ultrainstinct': {
      B.setBuff(attUser, 'immunity',      { exp: now + 8*H });
      B.setBuff(attUser, 'ignoreCounter', { exp: now + 8*H });
      setCD(attChar, name, CD_MS['7j']); saveUser(attUser);
      return msg.reply(ok('👁️ **Ultra Instinct** — Esquive toutes les attaques pendant **8h** !'));
    }

    case 'spiritbomb': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const sc3 = shieldCheck(targetUser, 'heian', 'heian');
      if (sc3?.blocked) return blocked(sc3.blocked);
      const wStolen = Math.floor((targetUser.wallet || 0) * 0.20);
      const bStolen = Math.floor((targetUser.bank   || 0) * 0.15);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - wStolen);
      targetUser.bank   = Math.max(0, (targetUser.bank   || 0) - bStolen);
      attUser.wallet += wStolen + bStolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['12j']); saveUser(attUser);
      return msg.reply(ok(`💥 **Spirit Bomb** — **${fmtC(wStolen)}** wallet + **${fmtC(bStolen)}** bank = **${fmtC(wStolen+bStolen)}** ${COIN} sur **${tName}** !`));
    }

    case 'trueinstinct': {
      B.setBuff(attUser, 'immunity', { exp: now + 24*H });
      B.setBuff(attUser, 'absorb',   { exp: now + 24*H, v: 1.0 });
      B.setBuff(attUser, 'ignoreCounter', { exp: now + 24*H });
      setCD(attChar, name, CD_MS['14j']); saveUser(attUser);
      return msg.reply(ok('👁️ **True Ultra Instinct** — Immunité 24h + 100% des attaques renvoyées !'));
    }

    // ══════════════════════════════════════════════
    //  NARUTO UZUMAKI
    // ══════════════════════════════════════════════

    case 'rasengan': {
      if (needTarget()) return;
      const res = doRob(attUser, targetUser, 1.5, { ignoreLevel: null });
      setCD(attChar, name, CD_MS['4h']); saveUser(attUser);
      return robResult(res, `🔵 **Rasengan** — **{n}** ${COIN} volés sur **${tName}** !`);
    }

    case 'shadowclone': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      let best = 0;
      for (let i = 0; i < 3; i++) {
        const pct = 0.10 + Math.random() * 0.20;
        const v = Math.floor((targetUser.wallet || 0) * pct);
        if (v > best) best = v;
      }
      if (best <= 0) return msg.reply(cd(`💸 **${tName}** n\'a rien sur lui !`));
      best = Math.min(best, targetUser.wallet);
      targetUser.wallet -= best; attUser.wallet += best;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['1j']); saveUser(attUser);
      return msg.reply(ok(`🌀 **Shadow Clone** — 3 tentatives, meilleur résultat : **${fmtC(best)}** ${COIN} sur **${tName}** !`));
    }

    case 'talkjutsu': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield');
      const stolen = Math.min(5000, targetUser.wallet || 0);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - stolen);
      attUser.wallet += stolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      return msg.reply(ok(`😂 **Talk no Jutsu** — Bouclier de **${tName}** retiré + **${fmtC(stolen)}** ${COIN} volés directement !`));
    }

    case 'rasenshuriken': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      const res = doRob(attUser, targetUser, 2.5, { ignoreLevel: 'basic' });
      setCD(attChar, name, CD_MS['3j']); saveUser(attUser);
      return robResult(res, `🌀 **Rasenshuriken** — Bouclier brisé + **{n}** ${COIN} sur **${tName}** !`);
    }

    case 'rasenbankgan': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const stolen = Math.floor((targetUser.bank || 0) * 0.15);
      if (stolen <= 0) return msg.reply(cd(`💸 La banque de **${tName}** est vide.`));
      targetUser.bank -= stolen; attUser.wallet += stolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['4j']); saveUser(attUser);
      return msg.reply(ok(`💸 **Rasengan Bank** — **15%** de la banque de **${tName}** : **${fmtC(stolen)}** ${COIN} !`));
    }

    case 'sagemode': {
      B.setBuff(attUser, 'shield',      { exp: now + 8*H, type: 'basic' });
      B.setBuff(attUser, 'counterRob',  { exp: now + 8*H, v: 0.20 });
      setCD(attChar, name, CD_MS['6j']); saveUser(attUser);
      return msg.reply(ok('🍃 **Sage Mode** — Bouclier 8h + tout attaquant perd 20% de ce qu\'il essaie de voler !'));
    }

    case 'kyuubi': {
      B.setBuff(attUser, 'robMult',       { exp: now + 8*H, v: 2.0 });
      B.setBuff(attUser, 'gainMult',      { exp: now + 8*H, v: 2.0 });
      B.setBuff(attUser, 'ignoreCounter', { exp: now + 8*H });
      setCD(attChar, name, CD_MS['7j']); saveUser(attUser);
      return msg.reply(ok('🦊 **Kyuubi Mode** — Rob x2 + gains x2 **8h** + brise Cache Heian !'));
    }

    case 'bijuubomb': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const sc4 = shieldCheck(targetUser, 'heian', 'heian');
      if (sc4?.blocked) return blocked(sc4.blocked);
      const wS = Math.floor((targetUser.wallet || 0) * 0.20);
      const bS = Math.floor((targetUser.bank   || 0) * 0.15);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - wS);
      targetUser.bank   = Math.max(0, (targetUser.bank   || 0) - bS);
      attUser.wallet += wS + bS;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['8j']); saveUser(attUser);
      return msg.reply(ok(`💣 **Bijuu Bomb** — **${fmtC(wS)}** wallet + **${fmtC(bS)}** bank = **${fmtC(wS+bS)}** ${COIN} sur **${tName}** !`));
    }

    case 'sixpaths': {
      B.setBuff(attUser, 'immunity',  { exp: now + 12*H });
      B.setBuff(attUser, 'gainMult',  { exp: now + 12*H, v: 2.0 });
      B.setBuff(attUser, 'sixPaths',  { exp: now + 12*H });
      setCD(attChar, name, CD_MS['10j']); saveUser(attUser);
      return msg.reply(ok('🌐 **Six Paths Sage** — Immunité 12h + gains x2. Débloque `=baryonmode` !'));
    }

    case 'baryonmode': {
      if (needTarget()) return;
      if (!attUser.buffs?.sixPaths?.exp > now) return msg.reply(err('❌ **Six Paths** doit être actif.'));
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      const wS = Math.floor((targetUser.wallet || 0) * 0.30);
      const bS = Math.floor((targetUser.bank   || 0) * 0.20);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - wS);
      targetUser.bank   = Math.max(0, (targetUser.bank   || 0) - bS);
      attUser.wallet += wS + bS;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['14j']); saveUser(attUser);
      return msg.reply(ok(`☄️ **Baryon Mode** — **${fmtC(wS)}** wallet + **${fmtC(bS)}** bank = **${fmtC(wS+bS)}** ${COIN} sur **${tName}** !`));
    }

    // ══════════════════════════════════════════════
    //  VEGETA
    // ══════════════════════════════════════════════

    case 'energyblast': {
      if (needTarget()) return;
      const res = doRob(attUser, targetUser, 1.2);
      setCD(attChar, name, CD_MS['3h']); saveUser(attUser);
      return robResult(res, `💢 **Energy Blast** — **{n}** ${COIN} volés sur **${tName}** !`);
    }

    case 'galickgun': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const amt = rand(8000, 20000);
      const stolen = Math.min(amt, targetUser.wallet || 0);
      if (stolen <= 0) return msg.reply(cd(`💸 **${tName}** n\'a rien sur lui !`));
      targetUser.wallet -= stolen; attUser.wallet += stolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['8h']); saveUser(attUser);
      return msg.reply(ok(`🔫 **Galick Gun** — **${fmtC(stolen)}** ${COIN} aspirés du wallet de **${tName}** !`));
    }

    case 'finalflash': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      if (Math.random() < 0.40) {
        B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      }
      const res = doRob(attUser, targetUser, 2.0, { ignoreLevel: 'basic' });
      setCD(attChar, name, CD_MS['3j']); saveUser(attUser);
      return robResult(res, `🔥 **Final Flash** — **{n}** ${COIN} + 40% de chance de briser le bouclier de **${tName}** !`);
    }

    case 'bigbang': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const stolen = Math.floor((targetUser.bank || 0) * 0.08);
      if (stolen <= 0) return msg.reply(cd(`💸 La banque de **${tName}** est vide.`));
      targetUser.bank -= stolen; attUser.wallet += stolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return msg.reply(ok(`💣 **Big Bang Attack** — **8%** bank de **${tName}** : **${fmtC(stolen)}** ${COIN} !`));
    }

    case 'vegblue': {
      if (needTarget()) return;
      B.setBuff(attUser, 'gainMult', { exp: now + 8*H, v: 1.5 });
      const res = doRob(attUser, targetUser, 1.8);
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return robResult(res, `⚡ **SSJ Blue (Vegeta)** — **{n}** ${COIN} + gains x1.5 **8h** !`);
    }

    case 'pride': {
      B.setBuff(attUser, 'absorb', { exp: now + 6*H, v: 0.60 });
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return msg.reply(ok('🛡️ **Pride Shield** — 60% de chaque attaque renvoyée pendant **6h** !'));
    }

    case 'fission': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      const res = doRob(attUser, targetUser, 1.5, { ignoreLevel: 'basic' });
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return robResult(res, `💥 **Spirit Fission** — Bouclier brisé + **{n}** ${COIN} sur **${tName}** !`);
    }

    case 'ultraego': {
      if (!attUser.buffs?.ultraEgo?.exp > now) {
        B.setBuff(attUser, 'ultraEgo', { exp: now + 10*H, hits: 0 });
        setCD(attChar, name, CD_MS['8j']); saveUser(attUser);
        return msg.reply(ok('😤 **Ultra Ego** — Mode actif 10h ! Plus tu encaisses d\'attaques, plus ton prochain rob est puissant (x1–x3).'));
      } else {
        const hits = attUser.buffs.ultraEgo.hits || 0;
        const mult = Math.min(3.0, 1.0 + hits * 0.3);
        B.setBuff(attUser, 'robMult', { exp: now + 2*H, v: mult });
        B.clearBuff(attUser, 'ultraEgo');
        saveUser(attUser);
        return msg.reply(ok(`😤 **Ultra Ego libéré** — Rob x**${mult.toFixed(1)}** pendant **2h** (basé sur **${hits}** attaques reçues) !`));
      }
    }

    case 'finalexplosion': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const selfLoss = Math.floor((attUser.wallet || 0) * 0.05);
      attUser.wallet = Math.max(0, attUser.wallet - selfLoss);
      const wS = Math.floor((targetUser.wallet || 0) * 0.15);
      const bS = Math.floor((targetUser.bank   || 0) * 0.10);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - wS);
      targetUser.bank   = Math.max(0, (targetUser.bank   || 0) - bS);
      attUser.wallet += wS + bS;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['12j']); saveUser(attUser);
      return msg.reply(ok(`💀 **Final Explosion** — **${fmtC(wS+bS)}** ${COIN} sur **${tName}** (tu as perdu **${fmtC(selfLoss)}** ${COIN}) !`));
    }

    // ══════════════════════════════════════════════
    //  MONKEY D. LUFFY
    // ══════════════════════════════════════════════

    case 'pistol': {
      if (needTarget()) return;
      const res = doRob(attUser, targetUser, 1.2);
      setCD(attChar, name, CD_MS['3h']); saveUser(attUser);
      return robResult(res, `👊 **Gomu Gomu no Pistol** — **{n}** ${COIN} sur **${tName}** !`);
    }

    case 'gear2': {
      B.setBuff(attUser, 'robMult',       { exp: now + 6*H, v: 1.5 });
      B.setBuff(attUser, 'ignoreCounter', { exp: now + 6*H });
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      return msg.reply(ok('⚡ **Gear Second** — Rob x1.5 + ignore counter-rob pendant **6h** !'));
    }

    case 'gear3': {
      if (needTarget()) return;
      const res = doRob(attUser, targetUser, 2.0);
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      return robResult(res, `💪 **Gear Third** — Rob x2 sur **${tName}** : **{n}** ${COIN} !`);
    }

    case 'redhawk': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const res = doRob(attUser, targetUser, 1.8);
      const burn = Math.floor((targetUser.wallet || 0) * 0.03);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - burn);
      saveUser(targetUser);
      setCD(attChar, name, CD_MS['1j']); saveUser(attUser);
      if (res.blocked) return blocked(res.blocked);
      if (res.empty)   return msg.reply(cd(`💸 **${tName}** n\'a rien !`));
      return msg.reply(ok(`🔴 **Red Hawk** — **${fmtC(res.stolen)}** ${COIN} + 3% du wallet de **${tName}** brûlé (**${fmtC(burn)}**) !`));
    }

    case 'kongorgan': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      let best = 0;
      for (let i = 0; i < 3; i++) {
        const pct = 0.10 + Math.random() * 0.20;
        const v = Math.floor((targetUser.wallet || 0) * pct);
        if (v > best) best = v;
      }
      if (best <= 0) return msg.reply(cd(`💸 **${tName}** n\'a rien !`));
      best = Math.min(best, targetUser.wallet);
      targetUser.wallet -= best; attUser.wallet += best;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['3j']); saveUser(attUser);
      return msg.reply(ok(`🥊 **Kong Organ** — 3 essais, meilleur : **${fmtC(best)}** ${COIN} sur **${tName}** !`));
    }

    case 'haki': {
      B.setBuff(attUser, 'reduceLoss', { exp: now + 8*H, v: 0.40 });
      setCD(attChar, name, CD_MS['3j']); saveUser(attUser);
      return msg.reply(ok('🛡️ **Armament Haki** — Tes pertes de rob réduites de **40%** pendant **8h** !'));
    }

    case 'gear4': {
      B.setBuff(attUser, 'shield', { exp: now + 12*H, type: 'basic' });
      B.setBuff(attUser, 'absorb', { exp: now + 12*H, v: 0.40 });
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return msg.reply(ok('🔵 **Gear Fourth** — Bouclier 12h + 40% des coins volés renvoyés à l\'attaquant !'));
    }

    case 'chaki': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.setBuff(targetUser, 'ko', { exp: now + 5 * 60_000, from: msg.author.id });
      saveUser(targetUser);
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return msg.reply(ok(`⚫ **Conqueror\'s Haki** — **${tName}** est KO pendant **5 minutes** !`));
    }

    case 'gear5': {
      B.setBuff(attUser, 'immunity',  { exp: now + 6*H });
      B.setBuff(attUser, 'robMult',   { exp: now + 6*H, v: 1.8 });
      B.setBuff(attUser, 'gainMult',  { exp: now + 6*H, v: 1.5 });
      B.setBuff(attUser, 'gear5',     { exp: now + 6*H });
      setCD(attChar, name, CD_MS['12j']); saveUser(attUser);
      return msg.reply(ok('🌀 **Gear Fifth** — Immunité 6h + rob x1.8 + gains x1.5. Débloque `=bajrang` !'));
    }

    case 'bajrang': {
      if (needTarget()) return;
      if (!attUser.buffs?.gear5?.exp > now) return msg.reply(err('❌ **Gear Fifth** doit être actif.'));
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      const wS = Math.floor((targetUser.wallet || 0) * 0.12);
      const bS = Math.floor((targetUser.bank   || 0) * 0.08);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - wS);
      targetUser.bank   = Math.max(0, (targetUser.bank   || 0) - bS);
      attUser.wallet += wS + bS;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['10j']); saveUser(attUser);
      return msg.reply(ok(`☄️ **Bajrang Gun** — **${fmtC(wS)}** wallet + **${fmtC(bS)}** bank = **${fmtC(wS+bS)}** ${COIN} sur **${tName}** !`));
    }

    // ══════════════════════════════════════════════
    //  RORONOA ZORO
    // ══════════════════════════════════════════════

    case 'onigiri': {
      if (needTarget()) return;
      const res = doRob(attUser, targetUser, 1.2);
      setCD(attChar, name, CD_MS['3h']); saveUser(attUser);
      return robResult(res, `🗡️ **Oni Giri** — **{n}** ${COIN} sur **${tName}** !`);
    }

    case 'santoryu': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      const res = doRob(attUser, targetUser, 1.5, { ignoreLevel: 'basic' });
      setCD(attChar, name, CD_MS['1j']); saveUser(attUser);
      return robResult(res, `⚔️ **Santoryu** — Bouclier brisé + **{n}** ${COIN} sur **${tName}** !`);
    }

    case 'toragari': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.setBuff(targetUser, 'ko', { exp: now + 30 * 60_000, from: msg.author.id }); // block counter 30min
      saveUser(targetUser);
      const res = doRob(attUser, targetUser, 1.8, { ignoreCounter: true });
      setCD(attChar, name, CD_MS['1j']); saveUser(attUser);
      return robResult(res, `🐯 **Tora Gari** — **{n}** ${COIN} + counter-rob de **${tName}** bloqué 30min !`);
    }

    case 'shishi': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const res = doRob(attUser, targetUser, 2.0);
      const bS  = Math.floor((targetUser.bank || 0) * 0.04);
      targetUser.bank = Math.max(0, (targetUser.bank || 0) - bS);
      attUser.wallet += bS;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      if (res.blocked) return blocked(res.blocked);
      if (res.empty)   return msg.reply(cd(`💸 **${tName}** n\'a rien !`));
      return msg.reply(ok(`🗡️ **Shishi Sonson** — **${fmtC(res.stolen)}** wallet + **${fmtC(bS)}** bank = **${fmtC(res.stolen+bS)}** ${COIN} sur **${tName}** !`));
    }

    case 'stealth': {
      B.setBuff(attUser, 'stealth', true);
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      return msg.reply(ok('🔇 **Stealth** — Ton prochain rob ne notifiera pas la cible !'));
    }

    case 'poundcanon': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      setCD(attChar, name, CD_MS['4j']); saveUser(attUser);
      return msg.reply(ok(`💫 **1080 Pound Canon** — Bouclier de **${tName}** brisé !`));
    }

    case 'blackblade': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const res = doRob(attUser, targetUser, 2.0, { ignoreLevel: 'basic', ignoreCounter: true });
      setCD(attChar, name, CD_MS['4j']); saveUser(attUser);
      return robResult(res, `⚫ **Black Blade** — Rob x2 ignorer anti-rob : **{n}** ${COIN} sur **${tName}** !`);
    }

    case 'ashura': {
      B.setBuff(attUser, 'robMult',       { exp: now + 6*H, v: 2.5 });
      B.setBuff(attUser, 'ignoreCounter', { exp: now + 6*H });
      setCD(attChar, name, CD_MS['7j']); saveUser(attUser);
      return msg.reply(ok('👁️ **Ashura** — Rob x2.5 + immunité counter-attaque pendant **6h** !'));
    }

    case 'kingofhell': {
      B.setBuff(attUser, 'immunity', { exp: now + 8*H });
      B.setBuff(attUser, 'absorb',   { exp: now + 8*H, v: 0.50 });
      setCD(attChar, name, CD_MS['7j']); saveUser(attUser);
      return msg.reply(ok('👑 **King of Hell** — Immunité 8h + 50% de chaque attaque renvoyée !'));
    }

    case 'supremeblade': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      const wS = Math.floor((targetUser.wallet || 0) * 0.12);
      const bS = Math.floor((targetUser.bank   || 0) * 0.06);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - wS);
      targetUser.bank   = Math.max(0, (targetUser.bank   || 0) - bS);
      attUser.wallet += wS + bS;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['10j']); saveUser(attUser);
      return msg.reply(ok(`🌑 **Supreme Blade** — **${fmtC(wS)}** wallet + **${fmtC(bS)}** bank = **${fmtC(wS+bS)}** ${COIN} sur **${tName}** !`));
    }

    // ══════════════════════════════════════════════
    //  LEVI ACKERMAN
    // ══════════════════════════════════════════════

    case 'thunderspear': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      const res = doRob(attUser, targetUser, 1.2, { ignoreLevel: 'basic' });
      setCD(attChar, name, CD_MS['6h']); saveUser(attUser);
      return robResult(res, `🗡️ **Thunder Spear** — Bouclier brisé + **{n}** ${COIN} sur **${tName}** !`);
    }

    case '3dmg': {
      B.setBuff(attUser, 'dodge',  true);
      B.setBuff(attUser, 'absorb', { exp: now + 12*H, v: 0.20 });
      setCD(attChar, name, CD_MS['12h']); saveUser(attUser);
      return msg.reply(ok('🔄 **3DMG** — Prochaine attaque esquivée + 20% renvoyés à l\'attaquant pendant **12h** !'));
    }

    case 'stealthstrike': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const res = doRob(attUser, targetUser, 1.3, { ignoreCounter: true });
      setCD(attChar, name, CD_MS['12h']); saveUser(attUser);
      return robResult(res, `🔇 **Stealth Strike** — Rob furtif : **{n}** ${COIN} sur **${tName}** sans notification !`);
    }

    case 'titankill': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      return msg.reply(ok(`🗡️ **Titan Killer** — Bouclier anti-rob de **${tName}** brisé !`));
    }

    case 'spinattack': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.setBuff(targetUser, 'ko', { exp: now + 5 * 60_000, from: msg.author.id });
      saveUser(targetUser);
      const res = doRob(attUser, targetUser, 1.5);
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      return robResult(res, `🌀 **Spin Attack** — **{n}** ${COIN} + **${tName}** stunné 5min !`);
    }

    case 'ackerman': {
      B.setBuff(attUser, 'robMult', { exp: now + 8*H, v: 1.8 });
      setCD(attChar, name, CD_MS['4j']); saveUser(attUser);
      return msg.reply(ok('⚡ **Ackerman Awakening** — Rob x1.8 pendant **8h** !'));
    }

    case 'formation': {
      B.setBuff(attUser, 'shield',     { exp: now + 8*H, type: 'basic' });
      B.setBuff(attUser, 'counterRob', { exp: now + 8*H, v: 0.10 });
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return msg.reply(ok('🛡️ **Survey Corps Formation** — Bouclier 8h + tout voleur perd 10% !'));
    }

    case 'nomercy': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      B.setBuff(targetUser, 'ko', { exp: now + 5 * 60_000, from: msg.author.id });
      saveUser(targetUser);
      const res = doRob(attUser, targetUser, 2.0, { ignoreLevel: 'basic' });
      setCD(attChar, name, CD_MS['7j']); saveUser(attUser);
      return robResult(res, `💪 **No Mercy** — Bouclier brisé + **{n}** ${COIN} + **${tName}** stunné 5min !`);
    }

    case 'laststand': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const success = Math.random() > 0.30;
      if (!success) {
        setCD(attChar, name, CD_MS['14j']); saveUser(attUser);
        return msg.reply(err(`⚰️ **Last Stand** — Échec ! Cooldown de 14j appliqué.`));
      }
      const res = doRob(attUser, targetUser, 2.5);
      setCD(attChar, name, CD_MS['8j']); saveUser(attUser);
      return robResult(res, `⚰️ **Last Stand** — Succès ! **{n}** ${COIN} sur **${tName}** !`);
    }

    // ══════════════════════════════════════════════
    //  KILLUA ZOLDYCK
    // ══════════════════════════════════════════════

    case 'lightningpalm': {
      if (needTarget()) return;
      const res = doRob(attUser, targetUser, 1.2);
      setCD(attChar, name, CD_MS['3h']); saveUser(attUser);
      return robResult(res, `⚡ **Lightning Palm** — **{n}** ${COIN} sur **${tName}** !`);
    }

    case 'narukami': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const amt = rand(5000, 15000);
      const stolen = Math.min(amt, targetUser.wallet || 0);
      if (stolen <= 0) return msg.reply(cd(`💸 **${tName}** n\'a rien !`));
      targetUser.wallet -= stolen; attUser.wallet += stolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['8h']); saveUser(attUser);
      return msg.reply(ok(`🔪 **Narukami** — **${fmtC(stolen)}** ${COIN} aspirés du wallet de **${tName}** !`));
    }

    case 'rhythmecho': {
      B.setBuff(attUser, 'dodge',  true);
      B.setBuff(attUser, 'absorb', { exp: now + 12*H, v: 0.15 });
      setCD(attChar, name, CD_MS['12h']); saveUser(attUser);
      return msg.reply(ok('💨 **Rhythm Echo** — Prochaine attaque esquivée + 15% renvoyés !'));
    }

    case 'stealthmode': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const res = doRob(attUser, targetUser, 1.3, { ignoreCounter: true });
      setCD(attChar, name, CD_MS['1j']); saveUser(attUser);
      return robResult(res, `🌑 **Stealth Mode** — Rob furtif : **{n}** ${COIN} sur **${tName}** !`);
    }

    case 'thunderbolt': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.setBuff(targetUser, 'ko', { exp: now + 5 * 60_000, from: msg.author.id });
      saveUser(targetUser);
      const res = doRob(attUser, targetUser, 1.5);
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      return robResult(res, `⚡ **Thunderbolt** — **{n}** ${COIN} + **${tName}** stunné 5min !`);
    }

    case 'yoyo': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      setCD(attChar, name, CD_MS['2j']); saveUser(attUser);
      return msg.reply(ok(`🗡️ **Yo-Yo** — Bouclier de **${tName}** brisé !`));
    }

    case 'pinshield': {
      B.setBuff(attUser, 'shield',     { exp: now + 6*H, type: 'basic' });
      B.setBuff(attUser, 'counterRob', { exp: now + 6*H, v: 0.08 });
      setCD(attChar, name, CD_MS['4j']); saveUser(attUser);
      return msg.reply(ok('🛡️ **Pin Shield** — Bouclier 6h + tout voleur perd 8% !'));
    }

    case 'silentkill': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      B.clearBuff(targetUser, 'shield'); saveUser(targetUser);
      const res = doRob(attUser, targetUser, 1.8, { ignoreLevel: 'basic', ignoreCounter: true });
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return robResult(res, `💀 **Silent Kill** — Bouclier brisé + rob furtif : **{n}** ${COIN} sur **${tName}** !`);
    }

    case 'godspeed': {
      B.setBuff(attUser, 'robMult', { exp: now + 2*H, v: 2.5 });
      B.setBuff(attUser, 'dodge',   true);
      setCD(attChar, name, CD_MS['8j']); saveUser(attUser);
      return msg.reply(ok('⚡ **Godspeed** — Rob x2.5 pendant **2h** + prochaine attaque esquivée !'));
    }

    // ══════════════════════════════════════════════
    //  LIGHT YAGAMI
    // ══════════════════════════════════════════════

    case 'shinigami': {
      if (needTarget()) return;
      const v = targetUser;
      const embed = new EmbedBuilder()
        .setColor(0x1a1a2e)
        .setTitle(`👁️ Shinigami Eyes — ${tName}`)
        .setDescription(`💰 Wallet : **${fmtC(v.wallet || 0)}** ${COIN}\n🏦 Banque : **${fmtC(v.bank || 0)}** ${COIN}`)
        .setFooter({ text: 'Information visible uniquement par toi' });
      setCD(attChar, name, CD_MS['12h']); saveUser(attUser);
      return msg.reply({ embeds: [embed], flags: 64 });
    }

    case 'agenda': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      const stolen = Math.min(3000, targetUser.wallet || 0);
      if (stolen <= 0) return msg.reply(cd(`💸 **${tName}** n\'a rien !`));
      targetUser.wallet -= stolen; attUser.wallet += stolen;
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['12h']); saveUser(attUser);
      return msg.reply(ok(`💸 **Hidden Agenda** — **${fmtC(stolen)}** ${COIN} volés directement à **${tName}** !`));
    }

    case 'kira': {
      if (needTarget()) return;
      if (targetUser.buffs?.casinoImmune?.exp > now) return msg.reply(cd(`🛡️ **${tName}** est immunisé(e) !`));
      B.setBuff(targetUser, 'kira', { exp: now + 12*H, v: 0.40, from: msg.author.id });
      saveUser(targetUser);
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return msg.reply(ok(`😈 **Kira's Judgment** — Les gains de **${tName}** réduits de **40%** pendant **12h** !`));
    }

    case 'deathnote': {
      if (needTarget()) return;
      if (targetUser.buffs?.casinoImmune?.exp > now) return msg.reply(cd(`🛡️ **${tName}** est immunisé(e) !`));
      B.setBuff(targetUser, 'casinoBan', { exp: now + 24*H, from: msg.author.id });
      saveUser(targetUser);
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return msg.reply(ok(`📓 **Death Note** — **${tName}** est banni(e) du casino pendant **24h** !`));
    }

    case 'intellect': {
      B.setBuff(attUser, 'casinoImmune', { exp: now + 24*H });
      setCD(attChar, name, CD_MS['5j']); saveUser(attUser);
      return msg.reply(ok('🧠 **Superior Intellect** — Immunité contre Death Note + Kira pendant **24h** !'));
    }

    case 'godcomplex': {
      B.setBuff(attUser, 'gainMult',    { exp: now + 12*H, v: 1.30 });
      B.setBuff(attUser, 'casinoImmune',{ exp: now + 12*H });
      setCD(attChar, name, CD_MS['4j']); saveUser(attUser);
      return msg.reply(ok('⚡ **God Complex** — Gains x1.3 pendant **12h** + immunité Kira !'));
    }

    case 'nemesis': {
      if (needTarget()) return;
      const kira = targetUser.buffs?.kira;
      if (!kira || kira.exp <= now) return msg.reply(cd(`❌ **${tName}** n\'a pas de Kira actif.`));
      const origSender = kira.from;
      const senderUser = getUser(origSender);
      B.clearBuff(targetUser, 'kira'); saveUser(targetUser);
      B.setBuff(senderUser, 'kira', { exp: now + 24*H, v: kira.v, from: msg.author.id });
      saveUser(senderUser);
      setCD(attChar, name, CD_MS['3j']); saveUser(attUser);
      return msg.reply(ok(`🔄 **L's Nemesis** — Kira de **${tName}** renvoyé à son expéditeur !`));
    }

    case 'near': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      if (targetUser.buffs?.casinoImmune?.exp > now) return msg.reply(cd(`🛡️ **${tName}** est immunisé(e) !`));
      B.clearBuff(targetUser, 'shield');
      B.setBuff(targetUser, 'kira',      { exp: now + 24*H, v: 0.40, from: msg.author.id });
      B.setBuff(targetUser, 'casinoBan', { exp: now + 12*H, from: msg.author.id });
      saveUser(targetUser);
      setCD(attChar, name, CD_MS['10j']); saveUser(attUser);
      return msg.reply(ok(`🎭 **Near the End** — **${tName}** : bouclier brisé + Kira 24h + ban casino 12h !`));
    }

    case 'worlddom': {
      if (needTarget()) return;
      if (B.isImmune(targetUser)) return blocked('infini');
      if (targetUser.buffs?.casinoImmune?.exp > now) return msg.reply(cd(`🛡️ **${tName}** est immunisé(e) !`));
      B.clearBuff(targetUser, 'shield');
      const wS = Math.floor((targetUser.wallet || 0) * 0.08);
      targetUser.wallet = Math.max(0, (targetUser.wallet || 0) - wS);
      attUser.wallet += wS;
      B.setBuff(targetUser, 'kira',      { exp: now + 24*H, v: 0.40, from: msg.author.id });
      B.setBuff(targetUser, 'casinoBan', { exp: now + 24*H, from: msg.author.id });
      saveUser(targetUser); saveUser(attUser);
      setCD(attChar, name, CD_MS['12j']); saveUser(attUser);
      return msg.reply(ok(`🌍 **World Domination** — **${fmtC(wS)}** ${COIN} volés + Kira + ban casino 24h sur **${tName}** !`));
    }

    default:
      // Commande dans ATTACK_MAP mais pas encore implémentée
      return msg.reply(err(`❌ Technique \`=${name}\` non disponible pour l'instant.`));
  }
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

        const embed = buildCdEmbed(msg.member, charData.owned, charData);
        return msg.reply({ embeds: [embed] });
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

      // ── Dispatch attaques personnages ──────────────────────
      const persoOwner = ATTACK_MAP[name];
      if (!persoOwner) return;

      const attUser = getUser(msg.author.id);

      // KO check
      if (B.isKOd(attUser)) {
        const rem = B.fmtT(attUser.buffs.ko.exp);
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`❌ Tu es KO pendant encore **${rem}** !`)] });
      }

      const attChar = getCharData(attUser);

      // Possession + équipement
      if (!attChar.owned.includes(persoOwner))
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`❌ Tu ne possèdes pas **${PERSOS[persoOwner].name}**.`)] });
      if (attChar.equipped !== persoOwner)
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`❌ Tu dois équiper **${PERSOS[persoOwner].name}** pour utiliser cette technique.\nUtilise \`=equiper ${persoOwner}\``)] });

      // Cooldown
      const cdEnd = attChar.cooldowns[name] || 0;
      if (cdEnd > Date.now()) {
        const tech = PERSOS[persoOwner].techniques.find(t => t.cmd.replace('=', '').split(' ')[0] === name);
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription(`⏳ **${tech?.name || name}** — Cooldown : **${formatRemaining(cdEnd - Date.now())}**`)] });
      }

      await handleAttack(msg, args, name, attUser, attChar);
    });

    console.log('[Persos] ✅ =persos · =attaques · =cd · =equiper · =shop · =acheter · =admindonnerperso · =adminretirerperso · =adminlisterpersos');
  },
};
