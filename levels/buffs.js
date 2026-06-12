'use strict';
/**
 * buffs.js — Gestion des buffs/debuffs personnages
 *
 * user.buffs = {
 *   // ── Offensifs (self) ──────────────────────────────────
 *   robMult:       { exp, v }      // Multiplicateur rob
 *   gainMult:      { exp, v }      // Multiplicateur gains
 *   ignoreCounter: { exp }         // Immunité counter-rob
 *   stealth:       true            // Prochain rob sans notif (consommé)
 *   stealRange:    { exp, v }      // Absorbe X% du prochain rob reçu et le renvoie (ultraEgo stack)
 *
 *   // ── Défenses ─────────────────────────────────────────
 *   shield:        { exp, type }   // 'basic' | 'heian' | 'infini'
 *   counterRob:    { exp, v }      // fraction renvoyée à l'attaquant
 *   reduceLoss:    { exp, v }      // réduit les pertes de rob de v
 *   absorb:        { exp, v }      // renvoie v fraction des coins volés
 *   dodge:         true            // absorbe la prochaine attaque (consommé)
 *
 *   // ── Immunités ────────────────────────────────────────
 *   immunity:      { exp }         // bloque toutes les attaques
 *   casinoImmune:  { exp }         // immunité ban casino + kira
 *
 *   // ── Prérequis / états ────────────────────────────────
 *   ssjBlue:       { exp }         // unlock ssjblue2
 *   sixPaths:      { exp }         // unlock baryonmode
 *   gear5:         { exp }         // unlock bajrang
 *   awak:          { exp }         // unlock lastblue/lastred (Gojo)
 *   heianForm:     { exp }         // Sukuna Heian Form
 *   ultraEgo:      { exp, hits }   // accumule les hits reçus
 *
 *   // ── Debuffs subis ────────────────────────────────────
 *   casinoBan:     { exp, from }   // ban casino
 *   kira:          { exp, v, from }// -v% gains
 *   gainDebuff:    { exp, v, from }// -v% gains (tableflip)
 *   ko:            { exp, from }   // bloque les commandes
 *   stunNext:      { n, from }     // bloque les n prochains messages
 * }
 */

const N = () => Date.now();

function isActive(user, key) {
  const b = user.buffs?.[key];
  if (!b) return false;
  if (typeof b === 'boolean') return b;
  if (b.n !== undefined) return b.n > 0;
  return b.exp !== undefined ? b.exp > N() : true;
}

function setBuff(user, key, data) {
  if (!user.buffs) user.buffs = {};
  user.buffs[key] = data;
}

function clearBuff(user, key) {
  if (user.buffs) delete user.buffs[key];
}

// ── Multiplicateur de gains nets ──
function getGainMult(user) {
  const b = user.buffs || {}, n = N();
  let v = 1;
  if (b.gainMult?.exp > n)   v *= b.gainMult.v;
  if (b.kira?.exp > n)       v *= (1 - (b.kira.v   || 0.4));
  if (b.gainDebuff?.exp > n) v *= (1 - (b.gainDebuff.v || 0.75));
  return v;
}

// ── Bouclier actif ──
// Returns { type: 'basic'|'heian'|'infini', exp } ou null
function getShield(user) {
  const b = user.buffs || {}, n = N();
  if (b.shield?.exp > n) return b.shield;
  return null;
}

// ── Immunité totale (infini ou immunity) ──
function isImmune(user) {
  const b = user.buffs || {}, n = N();
  return !!(b.immunity?.exp > n || (b.shield?.type === 'infini' && b.shield?.exp > n));
}

function isCasinoBanned(user) {
  return !!(user.buffs?.casinoBan?.exp > N());
}

function isKOd(user) {
  return !!(user.buffs?.ko?.exp > N());
}

function consumeDodge(user) {
  if (!user.buffs?.dodge) return false;
  delete user.buffs.dodge;
  return true;
}

function consumeStealth(user) {
  if (!user.buffs?.stealth) return false;
  delete user.buffs.stealth;
  return true;
}

function addStun(user, n, from) {
  setBuff(user, 'stunNext', { n, from });
}

function consumeStun(user) {
  const s = user.buffs?.stunNext;
  if (!s || s.n <= 0) return false;
  s.n -= 1;
  if (s.n === 0) delete user.buffs.stunNext;
  return true;
}

// ── Format durée restante ──
function fmtT(exp) {
  if (exp === Infinity) return 'définitivement';
  const s = Math.max(0, Math.floor((exp - N()) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${Math.max(1, m)}min`;
}

// ── Effets globaux de salon (en mémoire, perdu au redémarrage) ──
const GUILD_FX = new Map(); // `${guildId}:${type}` → { userId, exp, ...data }

function setGFX(guildId, type, data, durMs) {
  GUILD_FX.set(`${guildId}:${type}`, { ...data, userId: data.userId, exp: N() + durMs });
}

function getGFX(guildId, type) {
  const key = `${guildId}:${type}`;
  const e = GUILD_FX.get(key);
  if (!e) return null;
  if (e.exp <= N()) { GUILD_FX.delete(key); return null; }
  return e;
}

function clearGFX(guildId, type) {
  GUILD_FX.delete(`${guildId}:${type}`);
}

module.exports = {
  isActive, setBuff, clearBuff,
  getGainMult, getShield, isImmune,
  isCasinoBanned, isKOd,
  consumeDodge, consumeStealth,
  addStun, consumeStun,
  fmtT,
  GUILD_FX, setGFX, getGFX, clearGFX,
};
