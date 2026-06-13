'use strict';
// Encodeur Opus basé sur "mediaplex" (binaire natif), en remplacement de
// prism-media/opus qui ne supporte que opusscript (JS pur, très lourd en
// CPU) sur cette installation faute de pouvoir compiler @discordjs/opus
// (pas de Visual Studio). opusscript bloque la boucle d'événements assez
// longtemps pour faire rater les heartbeats vocaux (3 manqués -> Discord
// ferme la connexion -> boucle ready/signalling/connecting infinie).
const { Transform } = require('stream');
const { OpusEncoder } = require('mediaplex');

const CHANNELS    = 2;
const SAMPLE_RATE = 48000;
const FRAME_SIZE  = 960; // 20ms à 48kHz
const BYTES_PER_FRAME = FRAME_SIZE * CHANNELS * 2; // PCM s16le

class PcmToOpus extends Transform {
  constructor() {
    super();
    this._encoder = new OpusEncoder(SAMPLE_RATE, CHANNELS);
    this._buffer = Buffer.alloc(0);
  }

  _transform(chunk, _enc, callback) {
    this._buffer = this._buffer.length ? Buffer.concat([this._buffer, chunk]) : chunk;

    let offset = 0;
    while (this._buffer.length - offset >= BYTES_PER_FRAME) {
      const frame = this._buffer.subarray(offset, offset + BYTES_PER_FRAME);
      this.push(this._encoder.encode(frame, FRAME_SIZE));
      offset += BYTES_PER_FRAME;
    }
    this._buffer = offset > 0 ? this._buffer.subarray(offset) : this._buffer;

    callback();
  }

  _flush(callback) {
    if (this._buffer.length > 0) {
      const padded = Buffer.alloc(BYTES_PER_FRAME);
      this._buffer.copy(padded);
      this.push(this._encoder.encode(padded, FRAME_SIZE));
    }
    callback();
  }
}

module.exports = { PcmToOpus };
