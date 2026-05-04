const { EmbedBuilder } = require('discord.js');

const ADMINS_ROLES    = ['1473460100210360370', '1491458130322919435', '1361408552664568100'];
const SALON_COMMANDES = '1497312598062796911';

const peutUtiliserCommande = (message) => {
  const membre = message.member;
  if (membre && membre.roles.cache.some(r => ADMINS_ROLES.includes(r.id))) return true;
  return message.channel.id === SALON_COMMANDES;
};

const refuserCommande = async (message) => {
  await message.reply({ content: `Les commandes sont reservees au salon <#${SALON_COMMANDES}> !` });
};

// ========== PHRASES PAR TRANCHE D'IQ ==========
const PHRASES = [
  { max: 20,  emoji: '🥦', phrases: [
    'T\'as confondu ton cerveau avec une éponge sèche.',
    'Même une plante verte te dépasse intellectuellement.',
    'Les cailloux te regardent de haut.',
    'T\'as mis du temps à comprendre que l\'eau c\'est mouillé.',
    'Le wifi te snobe, il refuse de se connecter à toi.',
  ]},
  { max: 40,  emoji: '🐌', phrases: [
    'Y\'a encore de l\'espoir... mais faut pas se précipiter.',
    'T\'as réussi à allumer ton PC aujourd\'hui, bravo.',
    'Les escargots apprennent plus vite que toi.',
    'T\'as une pensée lente mais régulière, c\'est déjà ça.',
    'Le mode avion de ton cerveau est activé en permanence.',
  ]},
  { max: 60,  emoji: '😐', phrases: [
    'Il va falloir bosser mon gars.',
    'T\'es pas le plus malin de la salle, mais t\'es là.',
    'Moyen. Vraiment très moyen.',
    'T\'as le niveau pour jouer à la dame de pique.',
    'Ni brillant, ni nul. Juste... là.',
  ]},
  { max: 80,  emoji: '🙂', phrases: [
    'Pas mal, t\'arrives à compter jusqu\'à 10 sans les doigts.',
    'Dans la moyenne basse, mais la moyenne quand même.',
    'T\'as des éclairs de génie... très rares.',
    'Tu comprends les blagues deux secondes après tout le monde.',
    'Correct. Franchement correct.',
  ]},
  { max: 100, emoji: '😊', phrases: [
    'Honnête ! T\'es quelqu\'un de fiable intellectuellement.',
    'Dans la bonne moyenne, continue comme ça.',
    'T\'as toutes tes cartes en main.',
    'Solide. Vraiment solide.',
    'T\'arrives à suivre une conversation sans te perdre, respect.',
  ]},
  { max: 120, emoji: '🧠', phrases: [
    'Pas mal du tout ! T\'as quelques neurones qui bossent.',
    'T\'es clairement au-dessus de la moyenne.',
    'Les gens font appel à toi pour les trucs compliqués.',
    'T\'as une longueur d\'avance sur la plupart.',
    'Impressionnant, t\'as réfléchi avant de répondre.',
  ]},
  { max: 140, emoji: '🎓', phrases: [
    'T\'as un cerveau qui tourne à plein régime.',
    'Einstein te dirait bonjour dans la rue.',
    'T\'es le genre à résoudre un Rubik\'s cube en regardant ailleurs.',
    'Les profs t\'auraient adoré.',
    'T\'analyses tout avant d\'agir. Respect.',
  ]},
  { max: 160, emoji: '🔭', phrases: [
    'Génie en herbe détecté.',
    'T\'as probablement déjà résolu un problème que personne avait remarqué.',
    'Ton cerveau tourne en mode overclock.',
    'T\'aurais pu inventer quelque chose si t\'avais voulu.',
    'Les algorithmes te demandent des conseils.',
  ]},
  { max: 200, emoji: '🚀', phrases: [
    'Félicitations, t\'es probablement le plus intelligent de ce serveur.',
    'Hawking t\'aurait invité à dîner.',
    'T\'as transcendé le concept même d\'intelligence.',
    'Ton QI est si élevé que les autres ont du mal à te suivre.',
    'À ce niveau là, t\'aurais dû être scientifique.',
  ]},
];

const getCouleur = (iq) => {
  if (iq <= 20)  return 0x8B0000;
  if (iq <= 40)  return 0xff4444;
  if (iq <= 60)  return 0xff8c00;
  if (iq <= 80)  return 0xffd700;
  if (iq <= 100) return 0x90ee90;
  if (iq <= 120) return 0x57f287;
  if (iq <= 140) return 0x00bfff;
  if (iq <= 160) return 0x5865f2;
  return 0xa855f7;
};

const getBar = (iq) => {
  const max     = 200;
  const pct     = Math.min(iq / max, 1);
  const filled  = Math.round(pct * 20);
  const empty   = 20 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
};

// ========== COOLDOWN (1 fois par jour par user) ==========
const cooldowns = new Map();

module.exports = (client) => {

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.toLowerCase() !== '?iq') return;
    if (!peutUtiliserCommande(message)) return refuserCommande(message);

    const userId      = message.author.id;
    const aujourdhui  = new Date().toISOString().slice(0, 10);
    const dernierJour = cooldowns.get(userId);

    // Si déjà utilisé aujourd'hui, on renvoie le même résultat
    if (dernierJour && dernierJour.date === aujourdhui) {
      const { iq, phrase, emoji } = dernierJour;
      const tranche = PHRASES.find(p => iq <= p.max) || PHRASES[PHRASES.length - 1];

      const embed = new EmbedBuilder()
        .setTitle(`${emoji} Résultat IQ de ${message.member?.displayName || message.author.username}`)
        .setColor(getCouleur(iq))
        .setDescription(`*Tu as déjà passé le test aujourd'hui !*\n\n**"${phrase}"**`)
        .addFields(
          { name: '🧠 QI', value: `**${iq} points**`, inline: true },
          { name: '📊 Barre', value: `\`${getBar(iq)}\``, inline: false },
        )
        .setThumbnail(message.author.displayAvatarURL({ extension: 'png', size: 128 }))
        .setFooter({ text: 'Team Vortax 2024 - 2026 • Reset chaque jour' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // Tirage aléatoire avec distribution réaliste (centrée autour de 85-100)
    const rand = Math.random();
    let iq;
    if      (rand < 0.02) iq = Math.floor(Math.random() * 20) + 1;        // 1-20  (2%)
    else if (rand < 0.07) iq = Math.floor(Math.random() * 20) + 21;       // 21-40 (5%)
    else if (rand < 0.17) iq = Math.floor(Math.random() * 20) + 41;       // 41-60 (10%)
    else if (rand < 0.37) iq = Math.floor(Math.random() * 20) + 61;       // 61-80 (20%)
    else if (rand < 0.67) iq = Math.floor(Math.random() * 20) + 81;       // 81-100 (30%)
    else if (rand < 0.87) iq = Math.floor(Math.random() * 20) + 101;      // 101-120 (20%)
    else if (rand < 0.95) iq = Math.floor(Math.random() * 20) + 121;      // 121-140 (8%)
    else if (rand < 0.98) iq = Math.floor(Math.random() * 20) + 141;      // 141-160 (3%)
    else                  iq = Math.floor(Math.random() * 40) + 161;       // 161-200 (2%)

    const tranche = PHRASES.find(p => iq <= p.max) || PHRASES[PHRASES.length - 1];
    const phrase  = tranche.phrases[Math.floor(Math.random() * tranche.phrases.length)];
    const emoji   = tranche.emoji;

    cooldowns.set(userId, { date: aujourdhui, iq, phrase, emoji });

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} Résultat IQ de ${message.member?.displayName || message.author.username}`)
      .setColor(getCouleur(iq))
      .setDescription(`**"${phrase}"**`)
      .addFields(
        { name: '🧠 QI', value: `**${iq} points**`, inline: true },
        { name: '📊 Barre', value: `\`${getBar(iq)}\``, inline: false },
      )
      .setThumbnail(message.author.displayAvatarURL({ extension: 'png', size: 128 }))
      .setFooter({ text: 'Team Vortax 2024 - 2026 ' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  });

};