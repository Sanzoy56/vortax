'use strict';
const fs   = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Stocké en dehors du repo, comme level.json (cf. levels/db.js) : un git
// pull/reset/clean (sync auto GitHub Desktop sur la box) supprime les
// fichiers non trackés du repo.
const DATA_DIR = path.join(__dirname, '..', '..', 'vortax-data');
const FILE     = path.join(DATA_DIR, 'maintenance.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const CATEGORIES = {
  exp:      { label: 'Gains EXP',       emoji: '⭐', desc: "Bloque les gains d'XP (messages + vocal)" },
  economie: { label: 'Économie',        emoji: '💰', desc: '=dep =with =donner =rob =work + gains de coins' },
  casino:   { label: 'Casino',          emoji: '🎰', desc: '=bj =slots =pf =dice =roulette =cup =pfc =rr =spin' },
  persos:   { label: 'Personnages',     emoji: '⚔️', desc: '=shop =acheter =equiper + techniques de combat' },
  staff:    { label: 'Commandes Staff', emoji: '🛡️', desc: '=bancasino =debancasino =createroles =testsaison' },
};

let cache = null;
function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    cache = { categories: [] };
  }
  if (!Array.isArray(cache.categories)) cache.categories = [];
  return cache;
}

function save() {
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
}

function getActive() {
  return load().categories.slice();
}

function isActive(cat) {
  return load().categories.includes(cat);
}

function setActive(categories) {
  load().categories = categories.filter(c => CATEGORIES[c]);
  save();
}

function clear() {
  load().categories = [];
  save();
}

function maintenanceReply(cat) {
  const c = CATEGORIES[cat] || { label: cat, emoji: '🚧' };
  return { embeds: [new EmbedBuilder().setColor(0xf59e0b)
    .setDescription(`🚧 **${c.emoji} ${c.label}** est actuellement en maintenance. Réessaie plus tard !`)] };
}

module.exports = { CATEGORIES, getActive, isActive, setActive, clear, maintenanceReply };
