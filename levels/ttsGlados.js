'use strict';

const { MsEdgeTTS } = require('msedge-tts');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { Routes, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const FFMPEG = require('ffmpeg-static');
const execFileAsync = promisify(execFile);
const TMP = process.env.TEMP || '/tmp';

async function generateGladosAudio(text) {
  const edge = new MsEdgeTTS();
  await edge.setMetadata('fr-FR-DeniseNeural', 'audio-24khz-96kbitrate-mono-mp3');
  const stream = edge.toStream(text);
  const chunks = [];
  await new Promise((resolve, reject) => {
    stream.audioStream.on('data', c => chunks.push(c));
    stream.audioStream.on('end', resolve);
    stream.audioStream.on('error', reject);
  });

  const id = Date.now().toString(36);
  const tmpMp3 = path.join(TMP, `vtx_${id}.mp3`);
  const tmpOgg = path.join(TMP, `vtx_${id}.ogg`);
  fs.writeFileSync(tmpMp3, Buffer.concat(chunks));

  await execFileAsync(FFMPEG, [
    '-y', '-i', tmpMp3,
    '-af', [
      'asetrate=24000*0.82',
      'aresample=48000',
      'atempo=1.22',
      'chorus=0.5:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3',
      'aphaser=type=t:speed=0.3',
      'highpass=f=200',
      'lowpass=f=4000',
      'equalizer=f=1200:t=q:w=1:g=4',
      'equalizer=f=3000:t=q:w=0.5:g=2',
      'aecho=0.8:0.7:20:0.5',
    ].join(','),
    '-c:a', 'libopus', '-b:a', '64k',
    tmpOgg,
  ]);

  const ogg = fs.readFileSync(tmpOgg);
  const duration = Math.max(5, Math.ceil(ogg.length / (64000 / 8)));
  fs.unlinkSync(tmpMp3);
  fs.unlinkSync(tmpOgg);
  return { ogg, duration };
}

function fakeWaveform(durationSecs) {
  const samples = Math.max(32, Math.min(256, Math.floor(durationSecs * 10)));
  const buf = Buffer.alloc(samples);
  for (let i = 0; i < samples; i++) buf[i] = Math.floor(Math.random() * 180) + 40;
  return buf.toString('base64');
}

async function sendVoiceReply(client, channelId, messageId, text, guild) {
  let clean = text
    .replace(/<@!?(\d+)>/g, (_, id) => {
      const member = guild?.members?.cache.get(id);
      return member ? member.displayName : 'quelqu\'un';
    })
    .replace(/<@&(\d+)>/g, (_, id) => {
      const role = guild?.roles?.cache.get(id);
      return role ? role.name : 'un rôle';
    })
    .replace(/<#(\d+)>/g, (_, id) => {
      const ch = guild?.channels?.cache.get(id);
      return ch ? ch.name : 'un salon';
    })
    .replace(/<a?:\w+:\d+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return false;

  const { ogg, duration } = await generateGladosAudio(clean);

  await client.rest.post(Routes.channelMessages(channelId), {
    body: {
      flags: MessageFlags.IsVoiceMessage,
      message_reference: { message_id: messageId },
      attachments: [{
        id: '0',
        filename: 'voice-message.ogg',
        duration_secs: duration,
        waveform: fakeWaveform(duration),
      }],
    },
    files: [{
      data: ogg,
      name: 'voice-message.ogg',
      contentType: 'audio/ogg',
    }],
  });
  return true;
}

module.exports = { generateGladosAudio, sendVoiceReply, fakeWaveform };
