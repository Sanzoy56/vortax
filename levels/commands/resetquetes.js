'use strict';
const { getUser, saveUser, getAllUsers, today } = require('../../db');

const ADMIN_ROLE_ID = 'TON_ROLE_ID_ICI'; // remplace par l'ID du rôle admin/staff

function resetQuestsForUser(user) {
  user.quests = { date: null, list: [] };
  saveUser(user);
}

module.exports = {
  name: 'resetquetes',
  aliases: ['resetquest', 'resetquests'],
  async execute(message, args) {
    const isAdmin = message.member.permissions.has('Administrator')
      || message.member.roles.cache.has(ADMIN_ROLE_ID);

    if (!isAdmin) {
      return message.reply('❌ Tu n\'as pas la permission d\'utiliser cette commande.');
    }

    const target = args[0];

    // ── Reset pour tout le monde ──────────────────────────────
    if (target === 'all' || target === 'tout') {
      const allUsers = getAllUsers();
      let count = 0;
      for (const [id, user] of Object.entries(allUsers)) {
        resetQuestsForUser(user);
        count++;
      }
      return message.reply(`✅ Quêtes réinitialisées pour **${count}** membres. Les nouvelles quêtes seront générées à leur prochaine action.`);
    }

    // ── Reset pour un membre mentionné ────────────────────────
    const mentioned = message.mentions.members?.first();
    if (!mentioned) {
      return message.reply('❌ Utilisation : `=resetquetes @membre` ou `=resetquetes all` pour tout le monde.');
    }

    const user = getUser(mentioned.id);
    resetQuestsForUser(user);

    return message.reply(`✅ Quêtes réinitialisées pour **${mentioned.user.username}**. Les nouvelles quêtes seront générées à sa prochaine action.`);
  },
};