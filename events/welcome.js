const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const { getConfig } = require('../config')

const STATUS_COLORS = {
  online: '#43b581', idle: '#faa61a',
  dnd: '#f04747', offline: '#747f8d', invisible: '#747f8d',
};

async function generateCard(member, type) {
  const canvas = createCanvas(2048, 1024);
  const ctx    = canvas.getContext('2d');

  const bannerFile = type === 'welcome' ? 'welcome.png' : 'leave.png';
  const banner     = await loadImage(path.join(__dirname, `../assets/${bannerFile}`));
  ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);

  const status      = member.presence?.status ?? 'offline';
  const borderColor = STATUS_COLORS[status];
  const centerX = 430, centerY = 505, radius = 310;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 14, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();

  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512 });
  const avatar    = await loadImage(avatarURL);
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
  ctx.restore();

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 80px Impact';
  ctx.fillText(member.user.username, 780 + 1140 / 2, 185 + 145 / 2);
  ctx.font         = 'bold 85px Impact';
  ctx.fillText(String(member.guild.memberCount), 780 + 1140 / 2 + 40, 365 + 145 / 2 + 35);
  ctx.fillStyle    = 'rgba(255,255,255,0.6)';
  ctx.font         = 'bold 58px Impact';
  ctx.fillText(
    type === 'welcome' ? `Bienvenue sur ${member.guild.name} !` : `Au revoir ${member.user.username} !`,
    780 + 1140 / 2, 640 + 145 / 2 + 25
  );

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'card.png' });
}

module.exports = (client) => {
  client.on('guildMemberAdd', async (member) => {
    const config = await getConfig()
    const channel = member.guild.channels.cache.get(config.welcome);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const fetchedMember = await member.guild.members.fetch({ user: member.id, force: true });

      const attachment = await generateCard(fetchedMember, 'welcome');
      await channel.send({ files: [attachment] });

      if (fetchedMember.user.bot) {
        const botRole = config.roles?.auto_bot;
        if (botRole) await fetchedMember.roles.add(botRole).catch(err => console.error('❌ Erreur ajout rôle bot:', err.message));
      } else {
        const autoRoles = config.welcomeRole ? [config.welcomeRole] : [];
        for (const roleId of autoRoles) {
          await fetchedMember.roles.add(roleId).catch(err => console.error('❌ Erreur ajout rôle:', err.message));
        }
      }
    } catch (err) {
      console.error('❌ Erreur welcome:', err);
    }
  });

  client.on('guildMemberRemove', async (member) => {
    const config = await getConfig()
    const channel = member.guild.channels.cache.get(config.leave);
    try {
      const attachment = await generateCard(member, 'leave');
      await channel.send({ files: [attachment] });
    } catch (err) {
      console.error('❌ Erreur leave:', err);
    }
  });
};