# About NinbosVoice

- JavaScriptのみで実装した音声合成ソフトウェア
- 肉声不使用・ルールベースのロボットボイス
- 非ユーザーフレンドリー、記法覚えてね

# 使う

https://x768.github.io/vsynth/

PC版の Chrome / Firefox に対応しています。

# ローカルでhttpサーバーを立てる

```sh
$ cd docs
$ python -m http.server 8000
```

`http://localhost:8000` をブラウザで開くと使えます。

# ローカルファイルを開く

ローカルではESModuleが動作しないため、ESModuleを除去するスクリプトを実行します。

```sh
$ python make.py
```

`file:///vsynthのパス/local/index.html` をブラウザで開くと使えます。

# node.js で使う

## 注意

1. ベータ版のため、破壊的変更が頻繁に入ります。
2. ライセンスはGPLです。

```sh
$ npm install github:x768/vsynth
```

```js
import { readFileSync, writeFileSync } from 'fs';
import { SAMPLING_RATE, VoiceSynth } from 'ninbosvoice-tts/lib/vsynth.js';
import { parse_dictionary, WavFile } from 'ninbosvoice-tts/lib/misc.js';
import { get_dictionary_path } from 'ninbosvoice-tts/lib/helper.js';
import * as ja from 'ninbosvoice-tts/lang/ja.js';


const src = 'おはようございます。';

const to_phonemic = new ja.ToPhonemic();
to_phonemic.load(parse_dictionary(readFileSync(get_dictionary_path('dict_ja.txt'), {encoding:'utf-8'})));
const latin = to_phonemic.conv(src);
const pfn = new ja.ToSound({voiceless: true, reduce_pitch: true}).conv(latin);

const synth = new VoiceSynth(VoiceSynth.default_voice());
synth.set_pfn(pfn, 480, 4800, 400, 1);
const buf = new Float32Array(synth.get_remaining());
synth.generate(buf);

const wav = new WavFile(SAMPLING_RATE, 1, 1);
writeFileSync('ohayou.wav', wav.create([buf]));
```

npmを使用せず、ファイル単体をimportしても動作します。
sample.jsをご覧ください。

# 謝辞

本ソフトウェアは、 eSpeak NG のソースコード・音声データの一部を改変して利用しています。

https://github.com/espeak-ng/espeak-ng/
