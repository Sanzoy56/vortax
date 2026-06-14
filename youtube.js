const Parser = require('rss-parser');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('./config');

const parser = new Parser();

const CHANNEL_ID_YTB = 'UCFjCHig5fVqCtjL0Z_cWwlQ';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID_YTB}`;
const ROLE_ID = '1379482124075401326';
const CHECK_INTERVAL = 5 * 60 * 1000; // toutes les 5 minutes

// Persisté en dehors du repo (sinon perdu à chaque redémarrage du bot, ce qui
// faisait considérer la dernière vidéo postée comme "déjà connue" et
// l'annonce ne partait jamais dans le salon).
const DATA_DIR = path.join(__dirname, "..", "vortax-data");
const LAST_VIDEO_FILE = path.join(DATA_DIR, "youtube_last_video.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadLastVideoId() {
  try { return JSON.parse(fs.readFileSync(LAST_VIDEO_FILE, "utf8")).id ?? null; }
  catch { return null; }
}

function saveLastVideoId(id) {
  try { fs.writeFileSync(LAST_VIDEO_FILE, JSON.stringify({ id })); } catch {}
}

let derniereVideoId = loadLastVideoId();

async function checkYoutube(client) {
  try {
    const feed = await parser.parseURL(RSS_URL);
    const derniere = feed.items[0];

    if (!derniere) return;

    const videoId = derniere.id?.split(':').pop();

    // Premier lancement (jamais de fichier de persistance), on stocke juste sans notifier
    if (derniereVideoId === null) {
      derniereVideoId = videoId;
      saveLastVideoId(videoId);
      return;
    }

    if (videoId === derniereVideoId) return;

    derniereVideoId = videoId;
    saveLastVideoId(videoId);

    const cfg = await getConfig()
    const salon = await client.channels.fetch(cfg.youtube);
    if (!salon) return;

    const isLive = derniere.title?.toLowerCase().includes('live') ||
                   derniere.title?.toLowerCase().includes('🔴');

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const videoUrl = derniere.link;

    const embed = new EmbedBuilder()
      .setColor(isLive ? '#FF0000' : '#FF0000') // Rouge YouTube dans les 2 cas
      .setAuthor({
        name: 'YouTube',
        iconURL: 'https://www.youtube.com/favicon.ico',
      })
      .setTitle(isLive ? `🔴 ${derniere.title}` : derniere.title)
      .setURL(videoUrl)
      .setDescription(isLive ? '**VTX Vortax** est en live sur YouTube !' : '**VTX Vortax** vient de poster une nouvelle vidéo !')
      .setImage(thumbnailUrl) // Image grande (comme dans la capture)
      .setTimestamp(new Date(derniere.pubDate))
      .setFooter({ text: isLive ? 'YouTube Live' : 'YouTube' });

    await salon.send({
      content: isLive
        ? `<@&${ROLE_ID}> 🔴 **Vortax est en live !**`
        : `<@&${ROLE_ID}> 🎥 **Nouvelle vidéo de Vortax !**`,
      embeds: [embed]
    });

  } catch (err) {
    console.error('[YouTube] Erreur lors du check :', err);
  }
}

module.exports = { checkYoutube, CHECK_INTERVAL };