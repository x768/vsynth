import { readFileSync, writeFileSync } from 'fs';
import { JaReading } from './pub/lib/text_ja.js';
import { JaToPFN } from './pub/lib/phone_ja.js';
import { SAMPLING_RATE, VoiceSynth } from './pub/lib/vsynth.js';
import { WavFile } from './pub/lib/wavfile.js';


function generate(pfn, speed, pitch)
{
    const synth = new VoiceSynth(VoiceSynth.default_voice());
    synth.set_pfn(pfn, speed, pitch, 400, 1);
    const buf = new Float32Array(synth.get_remaining());
    synth.generate(buf);
    return buf;
}


const src = 'おはようございます。';

const reading = new JaReading();
reading.load_src(readFileSync('./pub/files/dict_ja.txt', {encoding:'utf-8'}));
const latin = reading.conv(src);
const pfn = new JaToPFN({voiceless: true, reduce_pitch: true}).conv(latin);

const buf = generate(pfn, 480, 4800);
const wav = new WavFile(SAMPLING_RATE, 1, 1);
writeFileSync('ohayou.wav', wav.create([buf]));
