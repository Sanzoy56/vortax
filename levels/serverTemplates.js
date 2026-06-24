'use strict';

const STYLES = {
  emoji: {
    label: '🎨 Emoji classique',
    desc: '💬・général, 📢・annonces',
    format: (emoji, name) => `${emoji}・${name}`,
  },
  minimal: {
    label: '⬜ Minimal',
    desc: 'général, annonces',
    format: (emoji, name) => name,
  },
  aesthetic: {
    label: '✦ Aesthetic',
    desc: '˚₊‧ général, ˚₊‧ annonces',
    format: (emoji, name) => `˚₊‧ ${name}`,
  },
  bracket: {
    label: '【】Bracket',
    desc: '【général】【annonces】',
    format: (emoji, name) => `【${name}】`,
  },
  arrow: {
    label: '╰ Arrow',
    desc: '╰・général, ╰・annonces',
    format: (emoji, name) => `╰・${name}`,
  },
  star: {
    label: '✧ Starry',
    desc: '✧ général ✧, ✧ annonces ✧',
    format: (emoji, name) => `✧ ${name}`,
  },
  bar: {
    label: '｜Bar',
    desc: '｜général, ｜annonces',
    format: (emoji, name) => `｜${name}`,
  },
  fancy: {
    label: '❥ Fancy',
    desc: '❥ général, ❥ annonces',
    format: (emoji, name) => `❥ ${name}`,
  },
};

const TEMPLATES = {
  gaming: {
    label: '🎮 Gaming',
    desc: 'Serveur orienté jeux vidéo et communauté gaming',
    channels: [
      { cat: '── ・INFORMATIONS・ ──', items: [
        { name: 'règles', emoji: '📜', type: 0 },
        { name: 'annonces', emoji: '📢', type: 0 },
        { name: 'mise-à-jour', emoji: '🔄', type: 0 },
        { name: 'rôles', emoji: '🎭', type: 0 },
        { name: 'partenariats', emoji: '🤝', type: 0 },
      ]},
      { cat: '── ・COMMUNAUTÉ・ ──', items: [
        { name: 'général', emoji: '💬', type: 0 },
        { name: 'présentation', emoji: '🪪', type: 0 },
        { name: 'médias', emoji: '📷', type: 0 },
        { name: 'memes', emoji: '😂', type: 0 },
        { name: 'suggestions', emoji: '💡', type: 0 },
        { name: 'sondages', emoji: '📊', type: 0 },
        { name: 'anniversaires', emoji: '🎂', type: 0 },
      ]},
      { cat: '── ・GAMING・ ──', items: [
        { name: 'recherche-team', emoji: '🔍', type: 0 },
        { name: 'fortnite', emoji: '🎯', type: 0 },
        { name: 'valorant', emoji: '🔫', type: 0 },
        { name: 'minecraft', emoji: '⛏️', type: 0 },
        { name: 'autres-jeux', emoji: '🕹️', type: 0 },
        { name: 'clips-highlights', emoji: '🎬', type: 0 },
        { name: 'screens', emoji: '📸', type: 0 },
      ]},
      { cat: '── ・ÉCONOMIE & FUN・ ──', items: [
        { name: 'commandes-bot', emoji: '🤖', type: 0 },
        { name: 'casino', emoji: '🎰', type: 0 },
        { name: 'giveaways', emoji: '🎉', type: 0 },
        { name: 'comptage', emoji: '🔢', type: 0 },
      ]},
      { cat: '── ・VOCAL・ ──', items: [
        { name: 'Général', emoji: '🔊', type: 2 },
        { name: 'Gaming 1', emoji: '🎮', type: 2 },
        { name: 'Gaming 2', emoji: '🎮', type: 2 },
        { name: 'Stream', emoji: '📺', type: 2 },
        { name: 'Musique', emoji: '🎵', type: 2 },
        { name: 'AFK', emoji: '💤', type: 2 },
      ]},
      { cat: '── ・STAFF・ ──', items: [
        { name: 'staff-chat', emoji: '🛡️', type: 0 },
        { name: 'candidatures', emoji: '📝', type: 0 },
        { name: 'logs-modération', emoji: '📋', type: 0 },
        { name: 'logs-messages', emoji: '💬', type: 0 },
        { name: 'logs-vocal', emoji: '🔊', type: 0 },
        { name: 'sanctions', emoji: '⚠️', type: 0 },
        { name: 'Réunion Staff', emoji: '🛡️', type: 2 },
      ]},
    ],
  },

  communaute: {
    label: '🌍 Communauté',
    desc: 'Serveur communautaire complet',
    channels: [
      { cat: '── ・ACCUEIL・ ──', items: [
        { name: 'bienvenue', emoji: '👋', type: 0 },
        { name: 'règlement', emoji: '📜', type: 0 },
        { name: 'annonces', emoji: '📢', type: 0 },
        { name: 'boost', emoji: '💎', type: 0 },
        { name: 'rôles-réactions', emoji: '🎭', type: 0 },
      ]},
      { cat: '── ・PRÉSENTATION・ ──', items: [
        { name: 'présentez-vous', emoji: '🪪', type: 0 },
        { name: 'arrivées-départs', emoji: '🚪', type: 0 },
      ]},
      { cat: '── ・DISCUSSION・ ──', items: [
        { name: 'général', emoji: '💬', type: 0 },
        { name: 'blabla', emoji: '🗣️', type: 0 },
        { name: 'débats', emoji: '⚖️', type: 0 },
        { name: 'confessions', emoji: '🤫', type: 0 },
        { name: 'coup-de-coeur', emoji: '❤️', type: 0 },
        { name: 'suggestions', emoji: '💡', type: 0 },
      ]},
      { cat: '── ・MÉDIAS・ ──', items: [
        { name: 'selfies', emoji: '🤳', type: 0 },
        { name: 'photos', emoji: '📷', type: 0 },
        { name: 'memes', emoji: '😂', type: 0 },
        { name: 'musique', emoji: '🎵', type: 0 },
        { name: 'créations', emoji: '🎨', type: 0 },
        { name: 'tiktok', emoji: '📱', type: 0 },
      ]},
      { cat: '── ・DIVERTISSEMENT・ ──', items: [
        { name: 'commandes-bot', emoji: '🤖', type: 0 },
        { name: 'casino', emoji: '🎰', type: 0 },
        { name: 'giveaways', emoji: '🎉', type: 0 },
        { name: 'jeux', emoji: '🎮', type: 0 },
        { name: 'quiz', emoji: '🧠', type: 0 },
      ]},
      { cat: '── ・VOCAL・ ──', items: [
        { name: 'Chill', emoji: '🎧', type: 2 },
        { name: 'Discussion', emoji: '💬', type: 2 },
        { name: 'Soirée', emoji: '🎉', type: 2 },
        { name: 'Musique', emoji: '🎵', type: 2 },
        { name: 'Privé (2 max)', emoji: '🔒', type: 2 },
        { name: 'AFK', emoji: '💤', type: 2 },
      ]},
      { cat: '── ・STAFF・ ──', items: [
        { name: 'staff-général', emoji: '🛡️', type: 0 },
        { name: 'tickets', emoji: '🎫', type: 0 },
        { name: 'logs', emoji: '📋', type: 0 },
        { name: 'sanctions', emoji: '⚠️', type: 0 },
        { name: 'Réunion', emoji: '🛡️', type: 2 },
      ]},
    ],
  },

  esport: {
    label: '⚔️ Esport / Team',
    desc: 'Serveur pour structure ou équipe compétitive',
    channels: [
      { cat: '── ・STRUCTURE・ ──', items: [
        { name: 'annonces', emoji: '📢', type: 0 },
        { name: 'règlement', emoji: '📜', type: 0 },
        { name: 'roster', emoji: '👥', type: 0 },
        { name: 'calendrier', emoji: '📅', type: 0 },
        { name: 'recrutement', emoji: '📝', type: 0 },
        { name: 'sponsors', emoji: '💼', type: 0 },
      ]},
      { cat: '── ・COMPÉTITION・ ──', items: [
        { name: 'stratégie', emoji: '🧠', type: 0 },
        { name: 'vod-review', emoji: '🎥', type: 0 },
        { name: 'compo-picks', emoji: '📋', type: 0 },
        { name: 'résultats', emoji: '🏆', type: 0 },
        { name: 'performances', emoji: '📊', type: 0 },
        { name: 'planning-matchs', emoji: '⏰', type: 0 },
        { name: 'adversaires', emoji: '🔍', type: 0 },
      ]},
      { cat: '── ・COMMUNAUTÉ・ ──', items: [
        { name: 'général', emoji: '💬', type: 0 },
        { name: 'clips', emoji: '🎬', type: 0 },
        { name: 'médias', emoji: '📷', type: 0 },
        { name: 'memes', emoji: '😂', type: 0 },
        { name: 'suggestions', emoji: '💡', type: 0 },
        { name: 'fan-art', emoji: '🎨', type: 0 },
      ]},
      { cat: '── ・VOCAL COMPÉTITIF・ ──', items: [
        { name: 'Entraînement', emoji: '🏋️', type: 2 },
        { name: 'Match Officiel', emoji: '⚔️', type: 2 },
        { name: 'Scrims', emoji: '🎯', type: 2 },
        { name: 'Coaching', emoji: '🎓', type: 2 },
      ]},
      { cat: '── ・VOCAL・ ──', items: [
        { name: 'Discussion', emoji: '🔊', type: 2 },
        { name: 'Chill', emoji: '🎧', type: 2 },
        { name: 'AFK', emoji: '💤', type: 2 },
      ]},
      { cat: '── ・DIRECTION・ ──', items: [
        { name: 'direction', emoji: '👑', type: 0 },
        { name: 'staff', emoji: '🛡️', type: 0 },
        { name: 'finance', emoji: '💰', type: 0 },
        { name: 'logs', emoji: '📋', type: 0 },
        { name: 'Réunion Direction', emoji: '👑', type: 2 },
      ]},
    ],
  },

  creatif: {
    label: '🎨 Créatif / Studio',
    desc: 'Serveur pour artistes et créateurs de contenu',
    channels: [
      { cat: '── ・VITRINE・ ──', items: [
        { name: 'bienvenue', emoji: '👋', type: 0 },
        { name: 'règles', emoji: '📜', type: 0 },
        { name: 'annonces', emoji: '📢', type: 0 },
        { name: 'portfolio', emoji: '🖼️', type: 0 },
      ]},
      { cat: '── ・GALERIE・ ──', items: [
        { name: 'dessins', emoji: '✏️', type: 0 },
        { name: 'digital-art', emoji: '🎨', type: 0 },
        { name: 'photographie', emoji: '📸', type: 0 },
        { name: 'graphisme', emoji: '🖌️', type: 0 },
        { name: 'animations', emoji: '🎞️', type: 0 },
        { name: '3d-render', emoji: '💎', type: 0 },
        { name: 'wip', emoji: '🔧', type: 0 },
      ]},
      { cat: '── ・AUDIO & VIDÉO・ ──', items: [
        { name: 'musique', emoji: '🎵', type: 0 },
        { name: 'beats', emoji: '🥁', type: 0 },
        { name: 'vidéo-montage', emoji: '🎬', type: 0 },
        { name: 'écriture', emoji: '✍️', type: 0 },
      ]},
      { cat: '── ・WORKSHOP・ ──', items: [
        { name: 'critiques', emoji: '💭', type: 0 },
        { name: 'tutoriels', emoji: '📚', type: 0 },
        { name: 'ressources', emoji: '🔗', type: 0 },
        { name: 'commissions', emoji: '💰', type: 0 },
        { name: 'collaborations', emoji: '🤝', type: 0 },
        { name: 'défis', emoji: '🏅', type: 0 },
      ]},
      { cat: '── ・DISCUSSION・ ──', items: [
        { name: 'général', emoji: '💬', type: 0 },
        { name: 'inspiration', emoji: '✨', type: 0 },
        { name: 'off-topic', emoji: '🌀', type: 0 },
        { name: 'promo', emoji: '📣', type: 0 },
      ]},
      { cat: '── ・VOCAL・ ──', items: [
        { name: 'Session créa', emoji: '🎨', type: 2 },
        { name: 'Collab live', emoji: '🤝', type: 2 },
        { name: 'Discussion', emoji: '🔊', type: 2 },
        { name: 'Écoute musique', emoji: '🎧', type: 2 },
      ]},
    ],
  },

  dev: {
    label: '💻 Développement',
    desc: 'Serveur pour développeurs et projets tech',
    channels: [
      { cat: '── ・HUB・ ──', items: [
        { name: 'annonces', emoji: '📢', type: 0 },
        { name: 'règles', emoji: '📜', type: 0 },
        { name: 'roadmap', emoji: '🗺️', type: 0 },
        { name: 'changelog', emoji: '📝', type: 0 },
      ]},
      { cat: '── ・DÉVELOPPEMENT・ ──', items: [
        { name: 'aide-code', emoji: '❓', type: 0 },
        { name: 'projets', emoji: '🚀', type: 0 },
        { name: 'code-review', emoji: '🔍', type: 0 },
        { name: 'bugs', emoji: '🐛', type: 0 },
        { name: 'architecture', emoji: '🏗️', type: 0 },
        { name: 'devops-ci-cd', emoji: '⚙️', type: 0 },
        { name: 'base-de-données', emoji: '🗄️', type: 0 },
      ]},
      { cat: '── ・LANGAGES・ ──', items: [
        { name: 'javascript', emoji: '🟨', type: 0 },
        { name: 'python', emoji: '🐍', type: 0 },
        { name: 'java-kotlin', emoji: '☕', type: 0 },
        { name: 'c-cpp-rust', emoji: '⚡', type: 0 },
        { name: 'web-frontend', emoji: '🌐', type: 0 },
        { name: 'mobile', emoji: '📱', type: 0 },
        { name: 'autres', emoji: '💻', type: 0 },
      ]},
      { cat: '── ・RESSOURCES・ ──', items: [
        { name: 'tutoriels', emoji: '📚', type: 0 },
        { name: 'veille-tech', emoji: '📰', type: 0 },
        { name: 'outils', emoji: '🔧', type: 0 },
        { name: 'emploi-freelance', emoji: '💼', type: 0 },
      ]},
      { cat: '── ・GÉNÉRAL・ ──', items: [
        { name: 'général', emoji: '💬', type: 0 },
        { name: 'memes', emoji: '😂', type: 0 },
        { name: 'off-topic', emoji: '🌀', type: 0 },
        { name: 'setup', emoji: '🖥️', type: 0 },
      ]},
      { cat: '── ・VOCAL・ ──', items: [
        { name: 'Code ensemble', emoji: '💻', type: 2 },
        { name: 'Debug session', emoji: '🐛', type: 2 },
        { name: 'Discussion', emoji: '🔊', type: 2 },
        { name: 'AFK', emoji: '💤', type: 2 },
      ]},
    ],
  },
};

function formatTemplate(templateKey, styleKey) {
  const tpl = TEMPLATES[templateKey];
  const style = STYLES[styleKey] || STYLES.emoji;
  if (!tpl) return null;

  return tpl.channels.map(cat => ({
    catName: cat.cat,
    channels: cat.items.map(ch => ({
      name: style.format(ch.emoji, ch.name),
      type: ch.type,
    })),
  }));
}

function listTemplatesEmbed() {
  let desc = '';
  Object.entries(TEMPLATES).forEach(([key, tpl], i) => {
    const count = tpl.channels.reduce((s, c) => s + c.items.length, 0);
    const cats = tpl.channels.length;
    desc += `**${i + 1}.** ${tpl.label}\n`;
    desc += `> ${tpl.desc} — ${cats} catégories, ${count} salons\n\n`;
  });
  return desc;
}

function listStylesEmbed() {
  let desc = '';
  Object.entries(STYLES).forEach(([key, s], i) => {
    desc += `**${i + 1}.** ${s.label} — \`${s.desc}\`\n`;
  });
  return desc;
}

function previewTemplate(templateKey, styleKey) {
  const formatted = formatTemplate(templateKey, styleKey);
  if (!formatted) return null;
  let preview = '';
  for (const cat of formatted) {
    preview += `📁 **${cat.catName}**\n`;
    for (const ch of cat.channels) {
      const icon = ch.type === 2 ? '🔊' : '💬';
      preview += `  ${icon} ${ch.name}\n`;
    }
    preview += '\n';
  }
  return preview;
}

module.exports = { TEMPLATES, STYLES, formatTemplate, listTemplatesEmbed, listStylesEmbed, previewTemplate };
