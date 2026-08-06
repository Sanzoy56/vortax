require('dotenv').config();
const play = require('play-dl');

(async () => {
  const id = await play.getFreeClientID();
  await play.setToken({
    useragent: [id],
    youtube: { cookie: process.env.YOUTUBE_COOKIE }
  });
  console.log('Token OK');

  try {
    const info = await play.video_basic_info('https://www.youtube.com/watch?v=RGNHNGVLsG8');
    console.log('Titre:', info.video_details.title);

    const s = await play.stream('https://www.youtube.com/watch?v=RGNHNGVLsG8');
    console.log('Stream OK, type:', s.type);
  } catch (e) {
    console.error('ERREUR:', e);
  }
})();