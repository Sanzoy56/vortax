const { createCanvas, loadImage } = require('canvas');

// Police système par défaut — pas de fichier .ttf custom à fournir.
const FONT = "'Segoe UI', 'Arial', sans-serif";

// ── Palette du thème "Profil / Inventaire" (rouge-bordeaux + or) ───────────
const THEME = {
  bgDark: '#1a0505',
  bgLight: '#3a0f10',
  border: '#7a1f28',
  gold: '#f0c14b',
  goldSoft: '#c9a24a',
  textMain: '#f2e6e6',
  textSub: '#b98a8a',
  boxBg: 'rgba(0,0,0,0.28)',
  boxBorder: 'rgba(240,193,75,0.25)',
};

// Couleur unique pour toute compétence débloquée, quelle que soit la branche
const UNLOCK_COLOR = '#4ade80';

// ── Helpers génériques ───────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function truncate(ctx, text, maxWidth) {
  if (!text) return '???';
  text = text.replace(/\s+/g, ' ').trim() || '???';
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = [...text];
  let t = chars;
  while (t.length > 1 && ctx.measureText(t.join('') + '…').width > maxWidth) t = t.slice(0, -1);
  return t.join('') + '…';
}

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-FR');
}

// Format compact pour les pastilles de coût : 200000 -> '200K', 2200000 -> '2.2M'
function fmtShort(n) {
  n = Number(n || 0);
  if (n >= 1000000) return (Math.round(n / 100000) / 10) + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(n);
}

async function drawAvatar(ctx, avatarURL, cx, cy, r, ringColor, ringW = 4) {
  ctx.beginPath();
  ctx.arc(cx, cy, r + ringW, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = ringW;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  try {
    const img = await loadImage(avatarURL + '?size=256');
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } catch {
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
}

// Fond à rayures diagonales, façon "carte vieux papier" bordeaux
function drawStripedBackground(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, r);
  ctx.save();
  ctx.clip();

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, THEME.bgDark);
  grad.addColorStop(1, THEME.bgLight);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Rayures diagonales fines, légèrement plus claires que le fond
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 14;
  const step = 34;
  const diag = w + h;
  for (let i = -h; i < diag; i += step) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }

  // Vignette (assombrit les bords)
  const vg = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(x, y, w, h);

  ctx.restore();

  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, r);
  ctx.strokeStyle = THEME.border;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawStatBox(ctx, x, y, w, h, label, value, valueColor) {
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = THEME.boxBg;
  ctx.fill();
  roundRect(ctx, x, y, w, h, 8);
  ctx.strokeStyle = THEME.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = THEME.gold;
  ctx.font = 'bold 11px ' + FONT;
  ctx.fillText(label.toUpperCase(), x + 12, y + 22);

  ctx.fillStyle = valueColor || THEME.textMain;
  ctx.font = 'bold 17px ' + FONT;
  ctx.fillText(truncate(ctx, String(value), w - 24), x + 12, y + h - 16);
}

function drawBar(ctx, x, y, w, h, percent, colorFrom, colorTo) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.strokeStyle = THEME.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  const fillW = Math.max(h, w * Math.min(Math.max(percent, 0), 1));
  const grad = ctx.createLinearGradient(x, y, x + fillW, y);
  grad.addColorStop(0, colorFrom);
  grad.addColorStop(1, colorTo);
  roundRect(ctx, x, y, fillW, h, h / 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

// ════════════════════════════════════════════════════════════
// 1. PROFIL — avatar large à gauche, 3 cases de stats à droite
//    (Level/XP, Rang actuel, VTX-COINS), barre XP en bas.
// ════════════════════════════════════════════════════════════
// profileData attendu :
// {
//   username, memberSince,           // "[Xenien] Sanzoy", "19/03/2025"
//   rangActuel,                      // "Vide" | nom du rang
//   level, xpCurrent, xpRequired,    // 4, 230, 300
//   vtxCoins,                        // 5040 (wallet + bank)
// }
async function generateProfile(member, profileData) {
  const W = 940, H = 248;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  drawStripedBackground(ctx, 2, 2, W - 4, H - 4, 16);

  // ── Bandeau titre ──
  const PAD = 26;
  ctx.fillStyle = THEME.textMain;
  ctx.font = 'bold 24px ' + FONT;
  ctx.fillText(truncate(ctx, profileData.username, 560), PAD, 42);

  ctx.fillStyle = THEME.textSub;
  ctx.font = '13px ' + FONT;
  ctx.fillText('Membre depuis : ' + (profileData.memberSince || '—'), PAD, 62);

  // petite pastille en haut à droite (icône décorative)
  ctx.beginPath();
  ctx.arc(W - 44, 40, 20, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.strokeStyle = THEME.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawBranchIcon(ctx, W - 44, 40, 11, 'star', THEME.gold);

  // ── Avatar + label "Membre" ──
  const AV_R = 60;
  const AV_CX = PAD + AV_R;
  const AV_CY = 136;
  await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }), AV_CX, AV_CY, AV_R, THEME.gold);

  const pillW = 90, pillH = 24;
  roundRect(ctx, AV_CX - pillW / 2, AV_CY + AV_R + 12, pillW, pillH, pillH / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  roundRect(ctx, AV_CX - pillW / 2, AV_CY + AV_R + 12, pillW, pillH, pillH / 2);
  ctx.strokeStyle = THEME.gold;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = THEME.gold;
  ctx.font = 'bold 12px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('Membre', AV_CX, AV_CY + AV_R + 28);
  ctx.textAlign = 'left';

  // ── Ligne de stats (3 colonnes) ──
  const GX = PAD + AV_R * 2 + 34;
  const GW = W - GX - PAD;
  const GAP = 10;
  const BOX_W = (GW - GAP * 2) / 3;
  const BOX_H = 60;
  const GY = 90;

  const stats = [
    { label: 'Level / XP', value: `${profileData.level} · ${fmt(profileData.xpCurrent)}/${fmt(profileData.xpRequired)} XP`, color: THEME.textMain },
    { label: 'Rang actuel', value: profileData.rangActuel || 'Vide', color: THEME.textMain },
    { label: 'VTX-Coins', value: fmt(profileData.vtxCoins) + ' ★', color: THEME.gold },
  ];

  stats.forEach((s, i) => drawStatBox(ctx, GX + i * (BOX_W + GAP), GY, BOX_W, BOX_H, s.label, s.value, s.color));

  // ── Barre XP ──
  const barY = GY + BOX_H + 18;
  const pct = profileData.xpRequired ? profileData.xpCurrent / profileData.xpRequired : 0;
  drawBar(ctx, GX, barY, GW, 10, pct, '#f5c842', '#e2701c');

  ctx.fillStyle = THEME.textSub;
  ctx.font = '11px ' + FONT;
  ctx.fillText(`${Math.round(pct * 1000) / 10}% vers le niveau ${(profileData.level || 0) + 1}`, GX, barY + 26);

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 1b. QUÊTES
// ════════════════════════════════════════════════════════════
const CAT_COLORS = { MSG: '#c9a86a', VOC: '#8b7ec8', SOC: '#c97b96', PRG: '#5b8ac4', EVT: '#6fae7f', SPE: '#c98a5b' };
const CAT_LABELS = { MSG: 'MESSAGES', VOC: 'VOCAL', SOC: 'SOCIAL', PRG: 'PROGRESSION', EVT: 'ÉVÉNEMENT', SPE: 'SPÉCIALE' };
const ROLE_META = {
  daily: { label: 'QUOTIDIENNE', color: '#6f9bd6' },
  weekly: { label: 'HEBDOMADAIRE', color: '#9585c9' },
  choice: { label: 'À CHOISIR', color: '#c9a24a' },
};

function drawGoldLine(ctx, x, y, w) {
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'rgba(245,200,66,0)');
  grad.addColorStop(0.2, '#f5c842');
  grad.addColorStop(0.8, '#f5c842');
  grad.addColorStop(1, 'rgba(245,200,66,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

function drawPill(ctx, x, y, text, color, filled = false) {
  ctx.font = 'bold 13px ' + FONT;
  const w = ctx.measureText(text).width + 28;
  const h = 30;
  roundRect(ctx, x - w, y, w, h, h / 2);
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#08080f';
  } else {
    ctx.fillStyle = rgba(color, 0.12);
    ctx.fill();
    roundRect(ctx, x - w, y, w, h, h / 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = color;
  }
  ctx.textAlign = 'center';
  ctx.fillText(text, x - w / 2, y + h / 2 + 4);
  ctx.textAlign = 'left';
  return h;
}

function drawActiveCard(ctx, role, q, x, y, w, h) {
  const roleMeta = ROLE_META[role] || ROLE_META.choice;
  const catColor = CAT_COLORS[q.cat] || '#7a7a9a';

  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = q.completed ? '#0e1712' : '#0e0e1c';
  ctx.fill();
  roundRect(ctx, x, y, w, h, 14);
  ctx.strokeStyle = q.completed ? '#3d6b4a' : '#1e1e45';
  ctx.lineWidth = 1;
  ctx.stroke();

  roundRect(ctx, x, y + 14, 5, h - 28, 3);
  ctx.fillStyle = roleMeta.color;
  ctx.fill();

  const TX = x + 34;
  const TW = w - 34 - 260;

  ctx.fillStyle = catColor;
  ctx.font = 'bold 11px ' + FONT;
  ctx.fillText(CAT_LABELS[q.cat] || q.cat, TX, y + 30);

  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText(truncate(ctx, q.label, TW), TX, y + 60);

  ctx.fillStyle = '#6b6b8a';
  ctx.font = '13px ' + FONT;
  ctx.fillText(truncate(ctx, q.desc || '', TW), TX, y + 82);

  const barW = w - 34 - 20;
  drawBar(ctx, TX, y + 108, barW, 12, Math.min((q.progress || 0) / q.target, 1), q.completed ? '#3d8f57' : roleMeta.color, q.completed ? '#3d8f57' : roleMeta.color);

  const pad2 = n => String(n).padStart(Math.max(2, String(q.target).length), '0');
  ctx.fillStyle = '#5a5a7a';
  ctx.font = 'bold 12px ' + FONT;
  ctx.textAlign = 'right';
  ctx.fillText(pad2(q.progress || 0) + ' / ' + pad2(q.target), x + barW + 34, y + 144);
  ctx.textAlign = 'left';

  drawPill(ctx, x + w - 24, y + 20, roleMeta.label, roleMeta.color);

  ctx.textAlign = 'right';
  const rewardParts = [];
  if (q.rewardExp) rewardParts.push('+' + fmt(q.rewardExp) + ' XP');
  if (q.rewardCoins) rewardParts.push('+' + fmt(q.rewardCoins) + ' coins');
  ctx.fillStyle = '#c9a24a';
  ctx.font = 'bold 14px ' + FONT;
  ctx.fillText(rewardParts.join(' · '), x + w - 24, y + 72);
  ctx.textAlign = 'left';

  if (q.completed) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#3d8f57';
    ctx.font = 'bold 12px ' + FONT;
    ctx.fillText('✓ Terminée', x + w - 24, y + 92);
    ctx.textAlign = 'left';
  }
}

function drawChoiceCard(ctx, slot, x, y, w, h) {
  const color = ROLE_META.choice.color;

  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = '#14120c';
  ctx.fill();
  roundRect(ctx, x, y, w, h, 14);
  ctx.strokeStyle = '#4a3f22';
  ctx.lineWidth = 1;
  ctx.stroke();

  roundRect(ctx, x, y + 14, 5, h - 28, 3);
  ctx.fillStyle = color;
  ctx.fill();

  const TX = x + 34;
  const TW = w - 34 - 220;

  ctx.fillStyle = color;
  ctx.font = 'bold 11px ' + FONT;
  ctx.fillText('SÉLECTION', TX, y + 28);

  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 18px ' + FONT;
  ctx.fillText('Choisis ta prochaine quête', TX, y + 52);

  const lineH = (h - 66) / slot.options.length;
  const descMaxW = TW - 210;

  slot.options.forEach((opt, i) => {
    const ly = y + 66 + i * lineH + lineH / 2;

    ctx.fillStyle = '#c9c9dd';
    ctx.font = 'bold 13px ' + FONT;
    ctx.fillText(truncate(ctx, `${i + 1}. ${opt.label}`, 180), TX, ly - 2);

    ctx.fillStyle = '#6b6b8a';
    ctx.font = '12px ' + FONT;
    ctx.fillText(truncate(ctx, opt.desc, descMaxW), TX + 190, ly - 2);

    const rewardParts = [];
    if (opt.rewardExp) rewardParts.push('+' + fmt(opt.rewardExp) + ' XP');
    if (opt.rewardCoins) rewardParts.push('+' + fmt(opt.rewardCoins) + ' coins');
    ctx.fillStyle = '#c9a24a';
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(rewardParts.join(' · '), x + w - 24, ly - 2);
    ctx.textAlign = 'left';

    if (i < slot.options.length - 1) {
      ctx.strokeStyle = '#26221a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(TX, y + 66 + (i + 1) * lineH);
      ctx.lineTo(x + w - 24, y + 66 + (i + 1) * lineH);
      ctx.stroke();
    }
  });

  drawPill(ctx, x + w - 24, y + 20, 'À CHOISIR', color);
}

async function generateQuests(member, slots) {
  const W = 1400;
  const PAD = 44;
  const HEADER_H = 150;
  const CARD_H = 172;
  const GAP = 20;
  const FOOT_H = 40;

  const H = HEADER_H + slots.length * CARD_H + (slots.length - 1) * GAP + FOOT_H;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);

  const displayName = member.displayName || member.user.username;
  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText(truncate(ctx, displayName, 500), PAD, 46);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 36px ' + FONT;
  ctx.fillText('QUÊTES', W / 2, 54);

  ctx.fillStyle = '#5a5a7a';
  ctx.font = '14px ' + FONT;
  ctx.fillText('Récompenses automatiques dès que le seuil est atteint.', W / 2, 80);
  ctx.textAlign = 'left';

  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true });
  await drawAvatar(ctx, avatarURL, W - PAD - 38, 56, 38, '#5a5a7a');

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const y = HEADER_H + i * (CARD_H + GAP);
    if (slot.status === 'choice') {
      drawChoiceCard(ctx, slot, PAD, y, W - PAD * 2, CARD_H);
    } else {
      drawActiveCard(ctx, slot.role, slot.quest, PAD, y, W - PAD * 2, CARD_H);
    }
  }

  ctx.fillStyle = '#35354d';
  ctx.font = '11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('Team Vortax', W / 2, H - 14);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 2. ARBRE DE COMPÉTENCES — 3 branches radiales depuis l'avatar central
// ════════════════════════════════════════════════════════════
// treeData attendu :
// {
//   pointsDispo, paliersDone, paliersTotal,   // 3, 0, 15
//   branches: [
//     { key, label, color, icon, tiers: [{done, locked}, ...5 items] },
//     ...3 branches
//   ]
// }
// icon attendu : 'sword' | 'diamond' | 'star'
// Icônes dessinées en vecteur (formes canvas) — rendu garanti sur tous les
// serveurs, même sans police d'emoji (fini les cases vides "tofu").
function drawBranchIcon(ctx, cx, cy, size, shape, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (shape) {
    case 'sword': {
      const s = size;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx, cy + s * 0.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.5, cy + s * 0.1);
      ctx.lineTo(cx + s * 0.5, cy + s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.7, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'diamond': {
      const s = size;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s * 0.72, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s * 0.72, cy);
      ctx.closePath();
      ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
      ctx.stroke();
      break;
    }
    case 'star': {
      const spikes = 5, outerR = size, innerR = size * 0.45;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (Math.PI / spikes) * i - Math.PI / 2;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
      ctx.stroke();
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawLockIcon(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y - 2, 4, Math.PI, 0);
  ctx.stroke();
  roundRect(ctx, x - 5, y - 2, 10, 7, 1.5);
  ctx.fill();
}

async function generateSkillTree(member, treeData) {
  const W = 1600, H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);
  drawStripedBackground(ctx, 2, 2, W - 4, H - 4, 24);

  // ── En-tête ──
  ctx.fillStyle = THEME.textMain;
  ctx.font = 'bold 15px ' + FONT;
  ctx.fillText('Points dispo : ' + (treeData.pointsDispo ?? 0), 34, 36);
  ctx.fillStyle = THEME.textSub;
  ctx.font = '14px ' + FONT;
  ctx.fillText(`Paliers : ${treeData.paliersDone ?? 0} / ${treeData.paliersTotal ?? 15}`, 34, 58);

  ctx.textAlign = 'center';
  ctx.fillStyle = THEME.gold;
  ctx.font = 'bold 38px ' + FONT;
  ctx.fillText('Arbre de compétences', W / 2, 50);
  ctx.fillStyle = THEME.textSub;
  ctx.font = '14px ' + FONT;
  ctx.fillText('REBORN  ·  5 branches × 5 paliers  ·  200K → 8M par branche', W / 2, 74);
  ctx.textAlign = 'left';

  const nameW = 300;
  ctx.textAlign = 'right';
  ctx.fillStyle = THEME.textMain;
  ctx.font = 'bold 18px ' + FONT;
  ctx.fillText(truncate(ctx, member.user.username, nameW), W - 84, 34);
  ctx.fillStyle = THEME.textSub;
  ctx.font = '13px ' + FONT;
  ctx.fillText('Joueur', W - 84, 54);
  ctx.textAlign = 'left';
  await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true }), W - 48, 38, 28, THEME.gold, 2);

  // ── Centre (avatar géant, point de départ des branches) ──
  const CX = W / 2, CY = H - 210;
  const CENTER_R = 60;

  const branches = treeData.branches || [];
  const NODE_R = 38;
  const NODE_GAP = 110;

  // Angles fixes et symétriques (gauche / haut / droite) — plus de jitter
  // aléatoire, donc plus de lignes en zigzag dans tous les sens.
  const ANGLES_DEG = [200, 270, 340];

  branches.forEach((branch, bi) => {
    const angle = (ANGLES_DEG[bi] ?? 270) * Math.PI / 180;
    const dx = Math.cos(angle), dy = Math.sin(angle);

    const tiers = branch.tiers || [];
    const doneCount = tiers.filter(t => t.done).length;

    // Label de branche à l'extrémité, bien dégagé du dernier nœud
    const labelDist = CENTER_R + NODE_GAP * (tiers.length + 0.85);
    const lx = CX + dx * labelDist;
    const ly = CY + dy * labelDist;
    ctx.textAlign = 'center';
    ctx.fillStyle = branch.color;
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillText(branch.label, lx, ly - 10);
    ctx.fillStyle = THEME.textSub;
    ctx.font = 'bold 26px ' + FONT;
    ctx.fillText(`${doneCount}/${tiers.length}`, lx, ly + 24);
    ctx.textAlign = 'left';

    // Ligne + nœuds, du centre vers l'extérieur, en ligne droite
    let prevX = CX, prevY = CY;
    for (let ni = 0; ni < tiers.length; ni++) {
      const dist = CENTER_R + NODE_GAP * (ni + 1);
      const nx = CX + dx * dist;
      const ny = CY + dy * dist;

      const tier = tiers[ni];
      const r = ni === tiers.length - 1 ? NODE_R + 12 : NODE_R; // dernier nœud plus gros

      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(nx, ny);
      if (tier.done) {
        ctx.strokeStyle = rgba(UNLOCK_COLOR, 0.9);
        ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = rgba(branch.color, 0.4);
        ctx.lineWidth = 3;
      }
      ctx.stroke();

      // Glow vert sur les paliers débloqués
      if (tier.done) {
        ctx.save();
        ctx.shadowColor = UNLOCK_COLOR;
        ctx.shadowBlur = 24;
      }

      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fillStyle = tier.done ? rgba(UNLOCK_COLOR, 0.28) : 'rgba(10,8,12,0.92)';
      ctx.fill();
      ctx.lineWidth = tier.locked === false && !tier.done ? 3 : 2;
      ctx.strokeStyle = tier.done ? UNLOCK_COLOR : rgba(branch.color, 0.55);
      ctx.stroke();

      if (tier.done) ctx.restore();

      drawBranchIcon(ctx, nx, ny, r * 0.42, branch.icon, tier.done ? UNLOCK_COLOR : rgba('#ffffff', 0.5));

      // cadenas si verrouillé
      if (tier.locked) {
        ctx.beginPath();
        ctx.arc(nx + r * 0.66, ny + r * 0.66, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a12';
        ctx.fill();
        ctx.strokeStyle = branch.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        drawLockIcon(ctx, nx + r * 0.66, ny + r * 0.66, branch.color);
      }

      // pastille : numéro du palier dans la branche (1/5, 2/5, ... 5/5)
      const tagW = 38, tagH = 20;
      ctx.textAlign = 'center';
      roundRect(ctx, nx - tagW / 2, ny + r + 8, tagW, tagH, tagH / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fill();
      ctx.fillStyle = tier.done ? UNLOCK_COLOR : THEME.textMain;
      ctx.font = 'bold 12px ' + FONT;
      ctx.fillText(`${ni + 1}/${tiers.length}`, nx, ny + r + 21);
      ctx.textAlign = 'left';

      // pastille : coût en VTX-Coins, affichée seulement si pas encore débloqué
      if (!tier.done && tier.cost != null) {
        const costText = fmtShort(tier.cost);
        ctx.font = 'bold 11px ' + FONT;
        const costTagW = ctx.measureText(costText).width + 18;
        const costTagH = 18;
        const costY = ny + r + 8 + tagH + 4;
        ctx.textAlign = 'center';
        roundRect(ctx, nx - costTagW / 2, costY, costTagW, costTagH, costTagH / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fill();
        roundRect(ctx, nx - costTagW / 2, costY, costTagW, costTagH, costTagH / 2);
        ctx.strokeStyle = rgba(THEME.gold, 0.5);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = THEME.gold;
        ctx.fillText(costText, nx, costY + 13);
        ctx.textAlign = 'left';
      }

      prevX = nx; prevY = ny;
    }
  });

  // ── Avatar central ──
  await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }), CX, CY, CENTER_R, THEME.gold, 4);

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 3. INVENTAIRE — même thème que le profil (rayures bordeaux + or)
// ════════════════════════════════════════════════════════════
// items attendu : [{ icon, name, qty, rarityColor }]
async function generateInventory(member, items, opts = {}) {
  const COLS = opts.cols || 5;
  const SLOT = 132;
  const GAP = 14;
  const PAD = 26;
  const HEADER_H = 84;

  const rows = Math.max(1, Math.ceil(items.length / COLS));
  const W = PAD * 2 + COLS * SLOT + (COLS - 1) * GAP;
  const H = HEADER_H + rows * SLOT + (rows - 1) * GAP + PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);
  drawStripedBackground(ctx, 2, 2, W - 4, H - 4, 16);

  await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true }), PAD + 26, 42, 26, THEME.gold, 3);

  ctx.fillStyle = THEME.textMain;
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText(truncate(ctx, member.displayName || member.user.username, 400), PAD + 64, 38);
  ctx.fillStyle = THEME.textSub;
  ctx.font = '12px ' + FONT;
  ctx.fillText(`Inventaire — ${items.length} objet${items.length > 1 ? 's' : ''}`, PAD + 64, 56);

  if (items.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = THEME.textSub;
    ctx.font = '15px ' + FONT;
    ctx.fillText('Inventaire vide.', W / 2, HEADER_H + 40);
    ctx.textAlign = 'left';
    return canvas.toBuffer('image/png');
  }

  items.forEach((it, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    const x = PAD + col * (SLOT + GAP);
    const y = HEADER_H + row * (SLOT + GAP);
    const accent = it.rarityColor || THEME.gold;

    roundRect(ctx, x, y, SLOT, SLOT, 10);
    ctx.fillStyle = THEME.boxBg;
    ctx.fill();
    roundRect(ctx, x, y, SLOT, SLOT, 10);
    ctx.strokeStyle = rgba(accent, 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '40px ' + FONT;
    ctx.fillStyle = accent;
    ctx.fillText(it.icon || '❔', x + SLOT / 2, y + 58);

    ctx.fillStyle = THEME.textMain;
    ctx.font = 'bold 12px ' + FONT;
    ctx.fillText(truncate(ctx, it.name, SLOT - 16), x + SLOT / 2, y + SLOT - 26);

    if (it.qty != null) {
      const tagW = 34, tagH = 18;
      roundRect(ctx, x + SLOT - tagW - 6, y + SLOT - tagH - 6, tagW, tagH, tagH / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fill();
      ctx.fillStyle = THEME.gold;
      ctx.font = 'bold 11px ' + FONT;
      ctx.fillText('x' + it.qty, x + SLOT - tagW / 2 - 6, y + SLOT - tagH / 2 - 1);
    }
    ctx.textAlign = 'left';
  });

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 4. BAL — solde du portefeuille, même thème que le profil
// ════════════════════════════════════════════════════════════
// userData attendu : { wallet, bank }  (repris tel quel de l'ancien modèle)
async function generateBal(member, userData) {
  const W = 640, H = 210;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);
  drawStripedBackground(ctx, 2, 2, W - 4, H - 4, 16);

  const PAD = 24;
  const AV_R = 46;
  const AV_CX = PAD + AV_R;
  const AV_CY = H / 2;
  await drawAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }), AV_CX, AV_CY, AV_R, THEME.gold);

  const TX = AV_CX + AV_R + 22;
  const TW = W - TX - PAD;

  ctx.fillStyle = THEME.textMain;
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText(truncate(ctx, member.displayName || member.user.username, TW), TX, 40);

  ctx.fillStyle = THEME.textSub;
  ctx.font = '12px ' + FONT;
  ctx.fillText('Solde du portefeuille', TX, 58);

  const wallet = userData.wallet || 0;
  const bank = userData.bank || 0;
  const total = wallet + bank;

  const metrics = [
    { label: 'Portefeuille', value: fmt(wallet), color: THEME.gold },
    { label: 'Banque', value: fmt(bank), color: THEME.textMain },
    { label: 'Total', value: fmt(total), color: THEME.gold },
  ];

  const GAP = 10;
  const BOX_W = (TW - GAP * 2) / 3;
  const BOX_Y = 76;
  const BOX_H = 96;

  metrics.forEach((m, i) => {
    const x = TX + i * (BOX_W + GAP);
    drawStatBox(ctx, x, BOX_Y, BOX_W, BOX_H, m.label, m.value, m.color);

    ctx.fillStyle = THEME.textSub;
    ctx.font = '10px ' + FONT;
    ctx.fillText('VTX-Coins', x + 12, BOX_Y + BOX_H - 34);
  });

  return canvas.toBuffer('image/png');
}

module.exports = { generateProfile, generateQuests, generateSkillTree, generateInventory, generateBal };