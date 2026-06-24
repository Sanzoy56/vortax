'use strict';

const STYLES = {
  emoji: {
    label: '🎨 Emoji',
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
    desc: '⟡ général, ⟡ annonces',
    format: (emoji, name) => `⟡ ${name}`,
  },
  bracket: {
    label: '【】Bracket',
    desc: '【général】【annonces】',
    format: (emoji, name) => `【${name}】`,
  },
  dot: {
    label: '• Dot',
    desc: '• général, • annonces',
    format: (emoji, name) => `• ${name}`,
  },
};

const TEMPLATES = {
  gaming: {
    label: '🎮 Gaming',
    desc: 'Serveur orienté jeux vidéo',
    channels: [
      { cat: 'INFORMATIONS', items: [
        { name: 'règles', emoji: '📜', type: 0 },
        { name: 'annonces', emoji: '📢', type: 0 },
        { name: 'rôles', emoji: '🎭', type: 0 },
      ]},
      { cat: 'GÉNÉRAL', items: [
        { name: 'général', emoji: '💬', type: 0 },
        { name: 'médias', emoji: '📷', type: 0 },
        { name: 'memes', emoji: '😂', type: 0 },
        { name: 'commandes-bot', emoji: '🤖', type: 0 },
      ]},
      { cat: 'GAMING', items: [
        { name: 'recherche-team', emoji: '🔍', type: 0 },
        { name: 'clips', emoji: '🎬', type: 0 },
        { name: 'résultats', emoji: '🏆', type: 0 },
      ]},
      { cat: 'VOCAL', items: [
        { name: 'Salon vocal 1', emoji: '🔊', type: 2 },
        { name: 'Salon vocal 2', emoji: '🔊', type: 2 },
        { name: 'AFK', emoji: '💤', type: 2 },
      ]},
      { cat: 'STAFF', items: [
        { name: 'staff-chat', emoji: '🛡️', type: 0 },
        { name: 'logs', emoji: '📋', type: 0 },
        { name: 'sanctions', emoji: '⚠️', type: 0 },
      ]},
    ],
  },

  communaute: {
    label: '🌍 Communauté',
    desc: 'Serveur communautaire généraliste',
    channels: [
      { cat: 'ACCUEIL', items: [
        { name: 'bienvenue', emoji: '👋', type: 0 },
        { name: 'règles', emoji: '📜', type: 0 },
        { name: 'annonces', emoji: '📢', type: 0 },
        { name: 'présentations', emoji: '🪪', type: 0 },
      ]},
      { cat: 'DISCUSSION', items: [
        { name: 'général', emoji: '💬', type: 0 },
        { name: 'débats', emoji: '🗣️', type: 0 },
        { name: 'suggestions', emoji: '💡', type: 0 },
        { name: 'médias', emoji: '📷', type: 0 },
      ]},
      { cat: 'LOISIRS', items: [
        { name: 'musique', emoji: '🎵', type: 0 },
        { name: 'films-séries', emoji: '🎬', type: 0 },
        { name: 'jeux', emoji: '🎮', type: 0 },
        { name: 'memes', emoji: '😂', type: 0 },
      ]},
      { cat: 'VOCAL', items: [
        { name: 'Discussion', emoji: '🔊', type: 2 },
        { name: 'Chill', emoji: '🎧', type: 2 },
        { name: 'AFK', emoji: '💤', type: 2 },
      ]},
      { cat: 'STAFF', items: [
        { name: 'staff', emoji: '🛡️', type: 0 },
        { name: 'logs', emoji: '📋', type: 0 },
      ]},
    ],
  },

  esport: {
    label: '⚔️ Esport / Compétitif',
    desc: 'Serveur pour équipe ou structure esport',
    channels: [
      { cat: 'ORGANISATION', items: [
        { name: 'annonces', emoji: '📢', type: 0 },
        { name: 'règlement', emoji: '📜', type: 0 },
        { name: 'calendrier', emoji: '📅', type: 0 },
        { name: 'recrutement', emoji: '📝', type: 0 },
      ]},
      { cat: 'ÉQUIPE', items: [
        { name: 'stratégie', emoji: '🧠', type: 0 },
        { name: 'vod-review', emoji: '🎥', type: 0 },
        { name: 'performances', emoji: '📊', type: 0 },
        { name: 'planning', emoji: '⏰', type: 0 },
      ]},
      { cat: 'COMMUNAUTÉ', items: [
        { name: 'général', emoji: '💬', type: 0 },
        { name: 'clips', emoji: '🎬', type: 0 },
        { name: 'médias', emoji: '📷', type: 0 },
      ]},
      { cat: 'MATCHS', items: [
        { name: 'Entraînement', emoji: '🔊', type: 2 },
        { name: 'Match officiel', emoji: '⚔️', type: 2 },
        { name: 'Coaching', emoji: '🎓', type: 2 },
      ]},
      { cat: 'VOCAL', items: [
        { name: 'Discussion', emoji: '🔊', type: 2 },
        { name: 'AFK', emoji: '💤', type: 2 },
      ]},
      { cat: 'STAFF', items: [
        { name: 'staff', emoji: '🛡️', type: 0 },
        { name: 'logs', emoji: '📋', type: 0 },
      ]},
    ],
  },

  creatif: {
    label: '🎨 Créatif / Artistique',
    desc: 'Serveur pour artistes et créateurs',
    channels: [
      { cat: 'ACCUEIL', items: [
        { name: 'bienvenue', emoji: '👋', type: 0 },
        { name: 'règles', emoji: '📜', type: 0 },
        { name: 'annonces', emoji: '📢', type: 0 },
      ]},
      { cat: 'CRÉATIONS', items: [
        { name: 'dessins', emoji: '🎨', type: 0 },
        { name: 'graphisme', emoji: '🖌️', type: 0 },
        { name: 'musique', emoji: '🎵', type: 0 },
        { name: 'vidéo', emoji: '🎬', type: 0 },
        { name: 'écriture', emoji: '✍️', type: 0 },
      ]},
      { cat: 'FEEDBACK', items: [
        { name: 'critiques', emoji: '💭', type: 0 },
        { name: 'commissions', emoji: '💰', type: 0 },
        { name: 'collaborations', emoji: '🤝', type: 0 },
      ]},
      { cat: 'DISCUSSION', items: [
        { name: 'général', emoji: '💬', type: 0 },
        { name: 'inspiration', emoji: '✨', type: 0 },
        { name: 'ressources', emoji: '📚', type: 0 },
      ]},
      { cat: 'VOCAL', items: [
        { name: 'Session créa', emoji: '🎨', type: 2 },
        { name: 'Discussion', emoji: '🔊', type: 2 },
      ]},
    ],
  },

  dev: {
    label: '💻 Développement',
    desc: 'Serveur pour développeurs',
    channels: [
      { cat: 'INFOS', items: [
        { name: 'annonces', emoji: '📢', type: 0 },
        { name: 'règles', emoji: '📜', type: 0 },
        { name: 'ressources', emoji: '📚', type: 0 },
      ]},
      { cat: 'DÉVELOPPEMENT', items: [
        { name: 'aide', emoji: '❓', type: 0 },
        { name: 'projets', emoji: '🚀', type: 0 },
        { name: 'code-review', emoji: '🔍', type: 0 },
        { name: 'bugs', emoji: '🐛', type: 0 },
        { name: 'devops', emoji: '⚙️', type: 0 },
      ]},
      { cat: 'LANGAGES', items: [
        { name: 'javascript', emoji: '🟨', type: 0 },
        { name: 'python', emoji: '🐍', type: 0 },
        { name: 'autres', emoji: '💻', type: 0 },
      ]},
      { cat: 'GÉNÉRAL', items: [
        { name: 'général', emoji: '💬', type: 0 },
        { name: 'memes', emoji: '😂', type: 0 },
        { name: 'veille-tech', emoji: '📰', type: 0 },
      ]},
      { cat: 'VOCAL', items: [
        { name: 'Code ensemble', emoji: '💻', type: 2 },
        { name: 'Discussion', emoji: '🔊', type: 2 },
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
