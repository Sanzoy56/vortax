'use strict';
const fs   = require('fs');
const path = require('path');

const DB_PATH     = path.join(__dirname, '../levels.json');
const SAISON_PATH = path.join(__dirname, '../saison.json');

// ── Lecture / écriture JSON ──────────────────────────────────────────────────

function getDB() {
  if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, '{}'); return {}; }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('[DB] levels.json corrompu, reset:', e.message);
    fs.writeFileSync(DB_PATH, '{}');
    return {};
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getSaison() {
  if (!fs.existsSync(SAISON_PATH)) {
    const d = { numero: 1, debut: Date.now() };
    fs.writeFileSync(SAISON_PATH, JSON.stringify(d, null, 2));
    return d;
  }
  try {
    const raw = fs.readFileSync(SAISON_PATH, 'utf8').trim();
    return raw ? JSON.parse(raw) : { numero: 1, debut: Date.now() };
  } catch {
    const d = { numero: 1, debut: Date.now() };
    fs.writeFileSync(SAISON_PATH, JSON.stringify(d, null, 2));
    return d;
  }
}

function saveSaison(data) {
  fs.writeFileSync(SAISON_PATH, JSON.stringify(data, null, 2));
}

// ── Structure utilisateur par défaut ────────────────────────────────────────

function getUser(db, userId) {
  if (!db[userId]) {
    db[userId] = {
      xp: 0, niveau: 0, coins: 0, streak: 0,
      dernierMessage: null,
      boostActif: null, malusActif: null,
      boostPermanent: null,
      quetes: null,
      inventaire: [],
      dernierRob: null,
      shieldActif: null,
      lameProchaineRob: false,
    };
  }
  // Migrations : ajout des champs manquants sur anciens profils
  const u = db[userId];
  if (!u.inventaire)                   u.inventaire        = [];
  if (u.dernierRob        === undefined) u.dernierRob        = null;
  if (u.shieldActif       === undefined) u.shieldActif       = null;
  if (u.lameProchaineRob  === undefined) u.lameProchaineRob  = false;
  if (u.boostPermanent    === undefined) u.boostPermanent    = null;
  return u;
}

// ── Verrou par utilisateur (évite les race conditions) ──────────────────────

const _locks = new Map();

function withLock(key, fn) {
  const prev = _locks.get(key) ?? Promise.resolve();
  const next = prev
    .then(() => fn())
    .catch(err => console.error(`[Lock] key=${key}:`, err));
  _locks.set(key, next);
  next.finally(() => { if (_locks.get(key) === next) _locks.delete(key); });
  return next;
}

module.exports = { getDB, saveDB, getSaison, saveSaison, getUser, withLock };