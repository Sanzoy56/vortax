const Parser = require('rss-parser');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const parser = new Parser();

const CHANNEL_ID_YTB = 'UCFjCHig5fVqCtjL0Z_cWwlQ';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID_YTB}`;
const DISCORD_SALON = '1362799456059265044';
const CHECK_INTERVAL = 5 * 60 * 1000; // toutes les 5 minutes

let derniereVideoId = null;

async function checkYoutube(client) {
  try {
    const feed = await parser.parseURL(RSS_URL);
    const derniere = feed.items[0];

    if (!derniere) return;

    const videoId = derniere.id?.split(':').pop();

    // Premier lancement, on stocke juste sans notifier
    if (derniereVideoId === null) {
      derniereVideoId = videoId;
      return;
    }

    if (videoId === derniereVideoId) return;

    derniereVideoId = videoId;

    const salon = await client.channels.fetch(DISCORD_SALON);
    if (!salon) return;

    const isLive = derniere.title?.toLowerCase().includes('live') || 
                   derniere.title?.toLowerCase().includes('🔴');

    const embed = new EmbedBuilder()
      .setColor(isLive ? '#FF0000' : '#FF6B6B')
      .setAuthor({ 
        name: 'VTX Vortax', 
        iconURL: 'https://www.youtube.com/favicon.ico',
        url: `https://www.youtube.com/@VTX-Vortax`
      })
      .setTitle(isLive ? `🔴 ${derniere.title}` : `🎥 ${derniere.title}`)
      .setURL(derniere.link)
      .setDescription(isLive ? 'Vortax est en live sur YouTube !' : 'Vortax a posté une nouvelle vidéo !')
      .setThumbnail(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
      .setTimestamp(new Date(derniere.pubDate))
      .setFooter({ text: isLive ? 'YouTube Live' : 'YouTube' });

    await salon.send({ 
      content: isLive ? '@everyone 🔴 **Vortax est en live !**' : '@everyone 🎥 **Nouvelle vidéo de Vortax !**',
      embeds: [embed] 
    });

  } catch (err) {
    console.error('[YouTube] Erreur lors du check :', err);
  }
}

module.exports = { checkYoutube, CHECK_INTERVAL };