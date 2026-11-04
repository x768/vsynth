import { writeFileSync } from 'node:fs';
import { SAMPLING_RATE, VoiceSynth } from './docs/lib/vsynth.js';
import { WavFile } from './docs/lib/misc.js';
import { get_dictionary } from './docs/lib/helper.js';
import * as ja from './docs/lang/ja.js';


const src = 'おはようございます。';

const to_phonemic = new ja.ToPhonemic();
to_phonemic.load(get_dictionary('dict_ja.txt'));
const phonemic = to_phonemic.conv(src);
const pfn = new ja.ToSound({}).conv(phonemic);

const synth = new VoiceSynth(VoiceSynth.default_voice());
synth.set_pfn(pfn, 480, 4800, 400, 1);
const buf = new Float32Array(synth.get_remaining());
synth.generate(buf);

const wav = new WavFile(SAMPLING_RATE, 1, 1);
writeFileSync('ohayou.wav', wav.create([buf]));
