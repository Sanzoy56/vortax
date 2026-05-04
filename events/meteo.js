const { EmbedBuilder } = require('discord.js');

const ADMINS_ROLES = ['1473460100210360370', '1491458130322919435', '1361408552664568100'];
const SALON_COMMANDES = '1497312598062796911';

const peutUtiliserCommande = (message) => {
  const membre = message.member;
  if (membre && membre.roles.cache.some(r => ADMINS_ROLES.includes(r.id))) return true;
  return message.channel.id === SALON_COMMANDES;
};

const refuserCommande = async (message) => {
  await message.reply({ content: `Les commandes sont reservees au salon <#${SALON_COMMANDES}> !` });
};

// Icônes météo selon le code
const getMeteoIcon = (code) => {
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 400) return '🌦️';
  if (code >= 500 && code < 600) return '🌧️';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫️';
  if (code === 800)               return '☀️';
  if (code === 801)               return '🌤️';
  if (code === 802)               return '⛅';
  if (code >= 803)               return '☁️';
  return '🌡️';
};

// Couleur de l'embed selon la température
const getCouleurTemp = (temp) => {
  if (temp <= 0)  return 0x00bfff;
  if (temp <= 10) return 0x87ceeb;
  if (temp <= 20) return 0x90ee90;
  if (temp <= 28) return 0xffd700;
  if (temp <= 35) return 0xff8c00;
  return 0xff2200;
};

// Direction du vent
const getDirectionVent = (deg) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
};

module.exports = (client) => {

  // ========== COMMANDE ?meteo ==========
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.toLowerCase().startsWith('?meteo')) return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    const ville = message.content.slice('?meteo'.length).trim();

    if (!ville) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff4444)
            .setDescription('❌ Utilise la commande comme ça : `?meteo Paris`'),
        ],
      });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url    = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(ville)}&appid=${apiKey}&units=metric&lang=fr`;

    let data;
    try {
      const res = await fetch(url);
      data = await res.json();
    } catch {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff4444)
            .setDescription('❌ Impossible de contacter l\'API météo. Réessaie plus tard.'),
        ],
      });
    }

    if (data.cod !== 200) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff4444)
            .setDescription(`❌ Ville introuvable : **${ville}**\nVérifie l'orthographe et réessaie.`),
        ],
      });
    }

    const temp        = Math.round(data.main.temp);
    const ressenti    = Math.round(data.main.feels_like);
    const tempMin     = Math.round(data.main.temp_min);
    const tempMax     = Math.round(data.main.temp_max);
    const humidite    = data.main.humidity;
    const description = data.weather[0].description;
    const code        = data.weather[0].id;
    const icon        = getMeteoIcon(code);
    const vitVent     = Math.round(data.wind.speed * 3.6); // m/s → km/h
    const dirVent     = getDirectionVent(data.wind.deg || 0);
    const visibilite  = data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : 'N/A';
    const nuages      = data.clouds.all;
    const pression    = data.main.pressure;
    const pays        = data.sys.country;
    const nomVille    = data.name;

    const lever  = new Date(data.sys.sunrise * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
    const coucher = new Date(data.sys.sunset  * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

    const embed = new EmbedBuilder()
      .setTitle(`${icon} Météo — ${nomVille}, ${pays}`)
      .setColor(getCouleurTemp(temp))
      .setDescription(`**${description.charAt(0).toUpperCase() + description.slice(1)}**`)
      .addFields(
        {
          name: '🌡️ Température',
          value: `**${temp}°C** (ressenti ${ressenti}°C)\n↓ ${tempMin}°C — ↑ ${tempMax}°C`,
          inline: true,
        },
        {
          name: '💧 Humidité & Pression',
          value: `Humidité : **${humidite}%**\nPression : **${pression} hPa**`,
          inline: true,
        },
        {
          name: '💨 Vent',
          value: `**${vitVent} km/h** (${dirVent})`,
          inline: true,
        },
        {
          name: '☁️ Nuages',
          value: `**${nuages}%** de couverture`,
          inline: true,
        },
        {
          name: '👁️ Visibilité',
          value: `**${visibilite}**`,
          inline: true,
        },
        {
          name: '🌅 Soleil',
          value: `Lever : **${lever}**\nCoucher : **${coucher}**`,
          inline: true,
        },
      )
      .setThumbnail(`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`)
      .setFooter({ text: `Team Vortax 2024 - 2026 • Données OpenWeatherMap` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  });

};