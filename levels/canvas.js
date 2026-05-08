'use strict';
const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder }       = require('discord.js');
const { getRang }                 = require('./xp');
const { xpPourNiveau, getStreakBonus } = require('./xp');
const { BOOSTS_PERMANENTS, TOUTES_QUETES } = require('./config');

// ── Helpers partagés ────────────────────────────────────────────────────────

function statusColor(presence) {
  switch (presence?.status) {
    case 'online': return '#43b581';
    case 'idle':   return '#faa61a';
    case 'dnd':    return '#f04747';
    default:       return '#747f8d';
  }
}

function formatCoins(c) {
  if (c >= 1_000_000) return (c / 1_000_000).toFixed(1) + 'M';
  if (c >= 1_000)     return (c / 1_000).toFixed(0) + 'k';
  return String(c);
}

async function fetchAvatar(user, size = 256) {
  try {
    return await loadImage(user.displayAvatarURL({ extension: 'png', size }));
  } catch {
    return null;
  }
}

// ── Canvas commun Top 10 ─────────────────────────────────────────────────────

async function buildTop10Canvas(guild, entries, title, getStats) {
  const W = 1400, H = 900;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Fond
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f0f1a'); bg.addColorStop(0.5, '#1a1a2e'); bg.addColorStop(1, '#0f0f1a');
  ctx.fillStyle = bg;
  ctx.roundRect(0, 0, W, H, 24); ctx.fill();

  // Bordures dorées
  const gold = ctx.createLinearGradient(0, 0, W, 0);
  gold.addColorStop(0, 'transparent'); gold.addColorStop(0.3, '#ffd700');
  gold.addColorStop(0.7, '#ffd700');   gold.addColorStop(1,   'transparent');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, W, 4); ctx.fillRect(0, H - 4, W, 4);

  // Titre
  ctx.font = 'bold 42px Arial'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 60);

  // Ligne centrale
  ctx.strokeStyle = 'rgba(255,215,0,0.2)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 2, 90); ctx.lineTo(W / 2, H - 20); ctx.stroke();

  const COL_X      = [120, 820];
  const ROWS_Y     = [150, 310, 470, 630, 790];
  const R          = 55;
  const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

  for (let i = 0; i < entries.length; i++) {
    const entry  = entries[i];
    const col    = i < 5 ? 0 : 1;
    const row    = i % 5;
    const cx     = COL_X[col];
    const cy     = ROWS_Y[row];
    const member = await guild.members.fetch(entry.id).catch(() => null);
    const nom    = member
      ? (member.displayName.replace(/[^\x00-\x7F]/g, '').trim() || member.user.username)
      : `User ${entry.id.slice(-4)}`;
    const sc = statusColor(member?.presence);

    // Carte de fond
    const cardX = col === 0 ? 20 : W / 2 + 20;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.roundRect(cardX, cy - R - 10, W / 2 - 40, 140, 12); ctx.fill();
    ctx.strokeStyle = i < 3 ? `${rankColors[i]}55` : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cardX, cy - R - 10, W / 2 - 40, 140, 12); ctx.stroke();

    // Avatar
    const avatar = member ? await fetchAvatar(member.user) : null;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    if (avatar) ctx.drawImage(avatar, cx - R, cy - R, R * 2, R * 2);
    else { ctx.fillStyle = '#2a2a3e'; ctx.fill(); }
    ctx.restore();

    // Cercle statut
    ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2);
    ctx.strokeStyle = sc; ctx.lineWidth = 4; ctx.stroke();

    // Badge rang
    const bx = cx + R - 8, by = cy - R + 8;
    ctx.fillStyle = i < 3 ? rankColors[i] : '#1a1a2e';
    ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = i < 3 ? rankColors[i] : '#ffffff33'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold 13px Arial'; ctx.fillStyle = i < 3 ? '#000' : '#fff'; ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}`, bx, by + 5);

    // Stats texte
    const tx = cx + R + 18; ctx.textAlign = 'left';
    ctx.font = 'bold 20px Arial'; ctx.fillStyle = i < 3 ? rankColors[i] : '#fff';
    ctx.fillText(nom.length > 16 ? nom.slice(0, 15) + '...' : nom, tx, cy - 22);

    const rang = getRang(entry.niveau ?? 0);
    ctx.font = '15px Arial';
    ctx.fillStyle = '#aaa'; ctx.fillText('Rang :', tx, cy + 5);
    ctx.fillStyle = '#fff'; ctx.fillText(rang?.nom ?? 'Aucun', tx + 58, cy + 5);

    // Stats spécifiques (level/xp ou coins/level)
    const stats = getStats(entry, tx, cy);
    for (const s of stats) {
      ctx.fillStyle = '#aaa'; ctx.fillText(s.label + ' :', tx, s.y);
      ctx.fillStyle = s.color ?? '#fff'; ctx.fillText(s.value, tx + s.offset, s.y);
    }
  }

  // Footer
  ctx.font = '14px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.textAlign = 'center';
  ctx.fillText('Team Vortax 2024 - 2026', W / 2, H - 12);

  return canvas;
}

// ── Exports canvas ───────────────────────────────────────────────────────────

async function buildProfilCanvas(target, member, user, now) {
  const rang        = getRang(user.niveau);
  const xpMax       = xpPourNiveau(user.niveau);
  const xpPct       = Math.min(user.xp / xpMax, 1);
  const streakBonus = getStreakBonus(user.streak);
  const sc          = statusColor(member?.presence);
  const boostPerm   = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);

  const W = 900, H = 320;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Fond
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d0d14'); bg.addColorStop(0.5, '#111120'); bg.addColorStop(1, '#0a0a10');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 20); ctx.fill();

  // Glow gauche
  const g1 = ctx.createRadialGradient(200, 20, 0, 200, 20, 300);
  g1.addColorStop(0, 'rgba(255,200,50,0.13)'); g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

  // Glow droit
  const g2 = ctx.createRadialGradient(W - 50, H, 0, W - 50, H, 320);
  g2.addColorStop(0, 'rgba(130,80,255,0.11)'); g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  // Bordure
  ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, W, H, 20);
  const brd = ctx.createLinearGradient(0, 0, W, H);
  brd.addColorStop(0, 'rgba(255,200,50,0.5)'); brd.addColorStop(0.4, 'rgba(130,80,255,0.3)'); brd.addColorStop(1, 'rgba(255,200,50,0.2)');
  ctx.strokeStyle = brd; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();

  // Diagonales décoratives
  ctx.save(); ctx.globalAlpha = 0.04; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
  ctx.restore();

  // Avatar
  const AX = 90, AY = H / 2, AR = 68;
  const halo = ctx.createRadialGradient(AX, AY, AR - 10, AX, AY, AR + 35);
  halo.addColorStop(0, 'rgba(255,200,50,0.20)'); halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(AX, AY, AR + 35, 0, Math.PI * 2); ctx.fill();

  ctx.save(); ctx.beginPath(); ctx.arc(AX, AY, AR + 6, 0, Math.PI * 2);
  ctx.strokeStyle = sc; ctx.lineWidth = 4; ctx.shadowColor = sc; ctx.shadowBlur = 12; ctx.stroke(); ctx.restore();

  ctx.save(); ctx.beginPath(); ctx.arc(AX, AY, AR, 0, Math.PI * 2); ctx.clip();
  const avatar = await fetchAvatar(target);
  if (avatar) ctx.drawImage(avatar, AX - AR, AY - AR, AR * 2, AR * 2);
  else { ctx.fillStyle = '#1a1a2e'; ctx.fill(); }
  ctx.restore();

  // Badge niveau
  const bx = AX + AR - 2, by = AY + AR - 2;
  ctx.save();
  const bg2 = ctx.createLinearGradient(bx - 20, by - 20, bx + 20, by + 20);
  bg2.addColorStop(0, '#ffd700'); bg2.addColorStop(1, '#ff9d00');
  ctx.beginPath(); ctx.arc(bx, by, 20, 0, Math.PI * 2);
  ctx.fillStyle = bg2; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8; ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = '#0d0d14'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = '#000';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(user.niveau > 999 ? '999+' : String(user.niveau), bx, by + 1);
  ctx.restore();

  // Texte pseudo
  const TX = AX + AR + 40;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const pseudo = member?.displayName ?? target.username;
  ctx.font = 'bold 30px Arial'; ctx.fillStyle = '#fff';
  ctx.fillText(pseudo.length > 20 ? pseudo.slice(0, 19) + '...' : pseudo, TX, 76);
  ctx.font = '13px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.fillText(`@${target.username}`, TX, 97);

  // Pill rang
  if (rang) {
    ctx.font = 'bold 12px Arial';
    const rw = ctx.measureText(rang.nom).width + 24;
    const pg = ctx.createLinearGradient(TX, 110, TX + rw, 136);
    pg.addColorStop(0, 'rgba(255,200,50,0.18)'); pg.addColorStop(1, 'rgba(130,80,255,0.18)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(TX, 110, rw, 24, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,50,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ffd700'; ctx.textBaseline = 'middle'; ctx.fillText(rang.nom, TX + 12, 122); ctx.textBaseline = 'alphabetic';
  }

  // Barre XP
  const BX = TX, BY = 158, BW = W - TX - 36, BH = 13;
  ctx.font = '12px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'left'; ctx.fillText('XP', BX, BY - 7);
  ctx.textAlign = 'right'; ctx.fillText(`${user.xp.toLocaleString()} / ${xpMax.toLocaleString()}`, BX + BW, BY - 7);
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.roundRect(BX, BY, BW, BH, BH / 2); ctx.fill();
  if (xpPct > 0) {
    const fw = Math.max(BH, BW * xpPct);
    const bf = ctx.createLinearGradient(BX, 0, BX + BW, 0);
    bf.addColorStop(0, '#ffd700'); bf.addColorStop(0.5, '#ff9d00'); bf.addColorStop(1, '#a855f7');
    ctx.save(); ctx.shadowColor = '#ffd70066'; ctx.shadowBlur = 8;
    ctx.fillStyle = bf; ctx.beginPath(); ctx.roundRect(BX, BY, fw, BH, BH / 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.roundRect(BX, BY, fw, BH / 2, BH / 2); ctx.fill();
  }
  ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'left';
  ctx.fillText(`${Math.round(xpPct * 100)}%`, BX, BY + BH + 15);

  // Stats
  const robDispo = !user.dernierRob || now - user.dernierRob >= (4 * 60 * 60 * 1000);
  const STATS = [
    { label: 'Coins',     value: formatCoins(user.coins) },
    { label: 'Streak',    value: `${user.streak}j +${Math.round(streakBonus * 100)}%` },
    { label: 'Boost',     value: user.boostActif?.expireAt > now ? `+${Math.round(user.boostActif.bonus * 100)}%` : 'Aucun' },
    { label: 'Permanent', value: boostPerm ? `+${Math.round(boostPerm.bonus * 100)}%` : 'Aucun' },
    { label: 'Rob',       value: robDispo ? 'Dispo' : 'Cooldown', color: robDispo ? '#43b581' : '#f04747' },
  ];
  const SW = (W - TX - 36) / STATS.length;
  STATS.forEach((s, i) => {
    const sx = TX + i * SW;
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.roundRect(sx, 205, SW - 8, 90, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = '11px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.textAlign = 'left'; ctx.fillText(s.label, sx + 10, 225);
    ctx.font = 'bold 15px Arial'; ctx.fillStyle = s.color ?? '#fff';
    ctx.fillText(s.value.length > 10 ? s.value.slice(0, 9) + '...' : s.value, sx + 10, 249);
  });

  return new AttachmentBuilder(canvas.toBuffer(), { name: 'profil.png' });
}

async function buildTopCanvas(guild, entries) {
  const canvas = await buildTop10Canvas(guild, entries, 'Classement VTX - Top 10', (e, tx, cy) => [
    { label: 'Level', value: String(e.niveau), color: '#ffd700', y: cy + 26, offset: 60 },
    { label: 'XP',    value: e.xp.toLocaleString(),             y: cy + 47, offset: 42 },
  ]);
  return new AttachmentBuilder(canvas.toBuffer(), { name: 'top10.png' });
}

async function buildTopMoneyCanvas(guild, entries) {
  const canvas = await buildTop10Canvas(guild, entries, 'Classement VTX - Top 10 Money', (e, tx, cy) => [
    { label: 'Coins', value: formatCoins(e.coins), color: '#ffd700', y: cy + 26, offset: 62 },
    { label: 'Level', value: String(e.niveau),                       y: cy + 47, offset: 60 },
  ]);
  return new AttachmentBuilder(canvas.toBuffer(), { name: 'topmoney.png' });
}

async function buildQuetesCanvas(user, author, member) {
  const { getQuetesJour } = require('./quetes');
  const liste     = getQuetesJour(user);
  const quetesDef = liste.map(e => {
    const def = TOUTES_QUETES.find(q => q.id === e.id);
    return def ? { ...def, progression: e.progression, completee: e.completee } : null;
  }).filter(Boolean);

  const completees = liste.filter(q => q.completee).length;
  const total      = liste.length;
  const COLS       = 2;
  const W          = 1400, PADDING = 28, HEADER_H = 120, ITEM_H = 72, ITEM_GAP = 8, COL_GAP = 16;
  const COL_W      = (W - PADDING * 2 - COL_GAP) / 2;
  const H          = HEADER_H + Math.ceil(total / COLS) * (ITEM_H + ITEM_GAP) + PADDING;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Fond
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d0d14'); bg.addColorStop(0.5, '#111120'); bg.addColorStop(1, '#0a0a10');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 20); ctx.fill();

  // Glows
  const g1 = ctx.createRadialGradient(200, 0, 0, 200, 0, 320);
  g1.addColorStop(0, 'rgba(255,200,50,0.10)'); g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

  // Bordure
  ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, W, H, 20);
  const brd = ctx.createLinearGradient(0, 0, W, H);
  brd.addColorStop(0, 'rgba(255,200,50,0.45)'); brd.addColorStop(0.5, 'rgba(130,80,255,0.25)'); brd.addColorStop(1, 'rgba(255,200,50,0.15)');
  ctx.strokeStyle = brd; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();

  // Ligne centrale
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(W / 2, PADDING + 10); ctx.lineTo(W / 2, H - PADDING); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // Header avatar
  const AR = 28, AX = PADDING + AR + 4, AY = PADDING + AR + 8;
  ctx.save(); ctx.beginPath(); ctx.arc(AX, AY, AR, 0, Math.PI * 2); ctx.clip();
  const av = await fetchAvatar(author);
  if (av) ctx.drawImage(av, AX - AR, AY - AR, AR * 2, AR * 2);
  else { ctx.fillStyle = '#1a1a2e'; ctx.fill(); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(AX, AY, AR + 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.stroke();

  const pseudo = member?.displayName ?? author.username;
  ctx.font = 'bold 24px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText((pseudo.length > 24 ? pseudo.slice(0, 23) + '...' : pseudo) + ' — Quêtes du jour', AX + AR + 16, AY - 6);
  ctx.font = '14px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.fillText(`${completees}/${total} complétées - reset à minuit`, AX + AR + 16, AY + 16);

  // Barre globale
  const GX = PADDING, GY = AY + AR + 14, GW = W - PADDING * 2, GH = 7, pct = completees / total;
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.roundRect(GX, GY, GW, GH, GH / 2); ctx.fill();
  if (pct > 0) {
    const gf = ctx.createLinearGradient(GX, 0, GX + GW, 0);
    gf.addColorStop(0, '#ffd700'); gf.addColorStop(0.6, '#ff9d00'); gf.addColorStop(1, '#a855f7');
    ctx.save(); ctx.shadowColor = '#ffd70055'; ctx.shadowBlur = 6;
    ctx.fillStyle = gf; ctx.beginPath(); ctx.roundRect(GX, GY, Math.max(GH, GW * pct), GH, GH / 2); ctx.fill(); ctx.restore();
  }

  // Quêtes
  const CAT_COLORS = { Messages: '#5865f2', Vocal: '#eb459e', Social: '#57f287', Progression: '#ffd700', Evenement: '#ff9d00', Speciale: '#a855f7' };
  const CAT_ICONS  = { Messages: 'MSG', Vocal: 'VOC', Social: 'SOC', Progression: 'PRG', Evenement: 'EVT', Speciale: 'SPE' };

  for (let i = 0; i < quetesDef.length; i++) {
    const q   = quetesDef[i];
    const col = i % 2, row = Math.floor(i / 2);
    const QX  = PADDING + col * (COL_W + COL_GAP);
    const QY  = HEADER_H + row * (ITEM_H + ITEM_GAP);
    const cc  = CAT_COLORS[q.cat] ?? '#888';

    ctx.fillStyle = q.completee ? 'rgba(87,242,135,0.06)' : 'rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.roundRect(QX, QY, COL_W, ITEM_H, 10); ctx.fill();
    ctx.fillStyle = cc; ctx.beginPath(); ctx.roundRect(QX, QY, 4, ITEM_H, [10, 0, 0, 10]); ctx.fill();

    ctx.font = 'bold 9px Arial'; ctx.fillStyle = cc; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(CAT_ICONS[q.cat] ?? '?', QX + 14, QY + 16);

    ctx.font = 'bold 15px Arial'; ctx.fillStyle = q.completee ? '#57f287' : '#fff';
    ctx.fillText(q.nom.length > 28 ? q.nom.slice(0, 27) + '...' : q.nom, QX + 14, QY + 33);

    ctx.font = '12px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillText(q.desc.length > 42 ? q.desc.slice(0, 41) + '...' : q.desc, QX + 14, QY + 50);

    // Récompenses
    ctx.textAlign = 'right'; ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#ffd700';
    ctx.fillText(`+${q.xp} XP`, QX + COL_W - 8, QY + 22);
    ctx.font = '11px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(`+${q.coins.toLocaleString()} coins`, QX + COL_W - 8, QY + 37);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(`${q.progression}/${q.cible}`, QX + COL_W - 8, QY + ITEM_H - 8);

    // Barre progression
    const BX = QX + 14, BY = QY + ITEM_H - 12, BW = COL_W - 130, BH = 5;
    const p  = Math.min(q.progression / q.cible, 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(BX, BY, BW, BH, BH / 2); ctx.fill();
    if (p > 0) {
      const bf = ctx.createLinearGradient(BX, 0, BX + BW, 0);
      if (q.completee) { bf.addColorStop(0, '#57f287'); bf.addColorStop(1, '#00b44c'); }
      else             { bf.addColorStop(0, cc);        bf.addColorStop(1, cc + '88'); }
      ctx.fillStyle = bf; ctx.beginPath(); ctx.roundRect(BX, BY, Math.max(BH, BW * p), BH, BH / 2); ctx.fill();
    }
    if (q.completee) {
      ctx.font = 'bold 18px Arial'; ctx.fillStyle = '#57f287';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('✓', QX + COL_W - 95, QY + 20); ctx.textBaseline = 'alphabetic';
    }
  }

  // Footer
  ctx.font = '12px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.textAlign = 'center';
  ctx.fillText('Team Vortax 2024 - 2026', W / 2, H - 8);

  return new AttachmentBuilder(canvas.toBuffer(), { name: 'quetes.png' });
}

module.exports = { buildProfilCanvas, buildTopCanvas, buildTopMoneyCanvas, buildQuetesCanvas };