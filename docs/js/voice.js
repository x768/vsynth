import { JaReading } from '../lib/text_ja.js';
import { SAMPLING_RATE, VoiceSynth } from '../lib/vsynth.js';
import { SettingDB } from './db.js';
import { WavPlayer } from './player.js';
import { FileDialogSet } from './dialog.js';
import { TtsPage } from './tts.js';
import { $e } from './utils.js';

export function create_icon(type)
{
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    e.setAttribute('viewBox', '-8,-8,16,16');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    e.classList.add('icon16');
    if (type === '+') {
        p.setAttribute('d', 'M0,-8 L0,8 M-8,0 L8,0');
    } else if (type === 'x') {
        p.setAttribute('d', 'M-6,-6 L6,6 M-6,6 L6,-6');
    } else {
        p.setAttribute('d', 'M0,-8 L0,2 M-4,-2 L0,2 L4,-2 M-7,0 L-7,5 L7,5 L7,0');
    }
    e.appendChild(p);
    return e;
}

class TabPage
{
    constructor(on_tabchange) {
        this.current_page = '';
        this.on_tabchange = on_tabchange;
        this.tabs = document.getElementById('tab').getElementsByTagName('div');
        for (const elem of this.tabs) {
            elem.addEventListener('click', e => {
                const k = e.currentTarget.dataset.tab;
                if (this.current_page !== k) {
                    const prev = this.current_page;
                    this.current_page = k;
                    this.#select_tabpage(k);
                    on_tabchange(prev, k);
                }
            });
        }
    }
    init(page) {
        this.#select_tabpage(page);
        this.on_tabchange(this.current_page, page);
        this.current_page = page;
    }
    #select_tabpage(key) {
        for (const b of this.tabs) {
            if (b.dataset.tab === key) {
                b.classList.add('tab-selected');
            } else {
                b.classList.remove('tab-selected');
            }
        }
        const k2 = 'page-' + key;
        for (const b of document.getElementsByClassName('page')) {
            if (b.getAttribute('id') === k2) {
                b.style.display = '';
            } else {
                b.style.display = 'none';
            }
        }
    }
}

class VoicesPage
{
    // 皆さんこんにちは
    static SAMPLE_JA = [
        'fLnv +30 fv +20 fv 7 ! 5 p0 0 A0 +10 A 7 A8',
        'Fnv +60 f5o9v 7 ! 5 p',
        'Fv0c5s +40 c5s +10 v0c0 +10 f5o9v 7 ! 5 p0',
        '=0.8 f0nv 7 ! 5 p0',
        'o2v0cL7 +30 v0 +10 o5L7v 7 ! 5 p0',
        '=0.8 Fnv 7 ! 5 p6',
        'fnv +30 fv +20 fv 7 ! 5 p6',
        'Fv0c +10 fv0c5 +40 c5 +10 v0 +10 fv 7 ! 5 p6',
        'f5o5L8v +50 f5o9v 7 ! 5 p6  7 A8 ^ A0',
        '.'];

    constructor(db, player, dialog) {
        this.db = db;
        this.player = player;
        this.dialog = dialog;
        this.voices = db.voices ;
        this.sub_undo = document.getElementById('sub-undo');
        this.sub_redo = document.getElementById('sub-redo');
        this.list = document.getElementById('voices-list');
        this.item_append = document.getElementById('voice-item-add');

        this.voice_pitch = document.getElementById('voice-pitch');
        this.voice_flutter = document.getElementById('voice-flutter');
        this.voice_fricative = document.getElementById('voice-fricative');
        this.voice_formant_h = document.getElementById('voice-formant-h');
        this.voice_formant_w = document.getElementById('voice-formant-w');
        this.voice_formant_f = document.getElementById('voice-formant-f');
        this.voice_formant_a = document.getElementById('voice-formant-a');
        const template = document.getElementById('voice-editor-template').content;
        this.voice_name = template.getElementById('voice-name');

        this.selected_voice = null;
        this.modified = false;
        this.on_list_change = null;

        if (db.voices.length > 0) {
            this.voices = db.voices;
        } else {
            this.voices = [
                {
                    name: 'Default',
                    icon: VoicesPage.create_default_icon(),
                    ...VoiceSynth.default_voice(),
                }
            ];
            this.db.save_voice(this.voices[0], 0);
        }
        db.voices = null

        for (const v of this.voices) {
            this.#append(v);
        }
        this.#select_profile(this.voices[0]);

        this.voice_name.addEventListener('change', e => {
            const t = e.currentTarget;
            const s = this.#get_safe_name(t.value, this.selected_voice.name);
            t.value = s;
            this.selected_voice.name = s;
            this.modified = true;
        });
        this.voice_name.addEventListener('focus', () => {
            this.selected_voice.elem.removeAttribute('draggable');
        });
        this.voice_name.addEventListener('blur', () => {
            this.selected_voice.elem.setAttribute('draggable', 'true');
        });
        this.item_append.addEventListener('click', () => {
            this.create_new_voice();
        });

        this.voice_pitch.addEventListener('change', e => {
            this.selected_voice.pitch = this.#number_limit(e);
        });
        this.voice_flutter.addEventListener('change', e => {
            this.selected_voice.flutter = this.#number_limit(e);
        });
        this.voice_fricative.addEventListener('change', e => {
            this.selected_voice.fricative = this.#number_limit(e);
        });
        this.voice_formant_h.addEventListener('change', e => {
            this.selected_voice.height = this.#formant_limit(e);
        });
        this.voice_formant_w.addEventListener('change', e => {
            this.selected_voice.width = this.#formant_limit(e);
        });
        this.voice_formant_f.addEventListener('change', e => {
            this.selected_voice.freq = this.#formant_limit(e);
        });
        this.voice_formant_a.addEventListener('change', e => {
            this.selected_voice.freqadd = this.#formant_limit(e);
        });

        document.getElementById('voice-sample-ja').addEventListener('click', e => {
            const t = e.currentTarget;
            t.disabled = true;
            this.#play_sample(t);
        });
        document.getElementById('sub-import-file').addEventListener('click', e => {
            this.dialog.show_upload('.json')
            .then(f => {
                if (f) this.import_file(f);
            });
        });
        document.getElementById('sub-export-file').addEventListener('click', e => {
            this.dialog.show_download(this.create_export_blob(), this.selected_voice.name + '.json');
        });
    }

    set_change_handler(f) {
        this.on_list_change = f;
    }

    #number_limit(e) {
        const t = e.currentTarget;
        let val = Number.parseInt(t.value);
        const min = Number.parseInt(t.min);
        const max = Number.parseInt(t.max);
        if (Number.isNaN(val)) {
            val = min;
            t.value = val;
        } else if (val < min) {
            val = min;
            t.value = val;
        } else if (val > max) {
            val = max;
            t.value = val;
        }
        this.modified = true;
        return val;
    }
    #formant_limit(e) {
        const t = e.currentTarget;
        const a = VoicesPage.#parse_formant(t);
        t.value = a.join('/');
        this.modified = true;
        return a;
    }

    #play_sample(button) {
        const synth = new VoiceSynth(this.get_voice());
        synth.set_pfn(VoicesPage.SAMPLE_JA, 480, 4800, 400, 1.0);
        const buf = new Float32Array(synth.get_remaining());
        synth.generate(buf);
        this.player.play(buf).then(() => {
            button.disabled = false;
        });
    }

    show() {
        this.sub_undo.disabled = true;
        this.sub_redo.disabled = true;
    }
    hide() {
        if (this.modified) {
            const idx = this.voices.indexOf(this.selected_voice);
            this.db.save_voice(this.selected_voice, idx);
            this.modified = false;
        }
    }
    on_undo() {
    }
    create_new_voice() {
        const voice = {
            icon: VoicesPage.create_default_icon(),
            pitch: 100,
            flutter: 64,
            roughness: 1,
            fricative: 48,
            height: new Int16Array([236,236,240,232,200,200,256]),
            width: new Int16Array([294,256,256,320,342,342,256]),
            freq: new Int16Array([256,256,256,256,256,256,256]),
            freqadd: new Int16Array([0,0,0,0,0,0,0]),
        };
        voice.name = this.#get_safe_name('Untitled', null);
        this.voices.push(voice);
        this.#append(voice);
        this.#select_profile(voice);
        this.db.save_voice(voice, this.voices.length - 1);
    }
    delete_item(idx) {
        if (this.voices.length === 1) return;

        const item = this.list.childNodes[idx];
        const voice = this.voices.splice(idx, 1)[0];
        item.remove();
        this.#renumber();
        if (voice === this.selected_voice) {
            this.selected_voice = null;
            this.#select_profile(this.voices[idx > 0 ? idx - 1 : 0]);
        }
        if (this.on_list_change) {
            this.on_list_change();
        }
        this.db.save_all_voices(this.voices);
    }
    async import_file(file) {
        const name = file.name.replace(/\.json$/i, '');
        const src = await file.text();
        const voice = JSON.parse(src);
        for (const k in voice) {
            if (voice[k] instanceof Array) {
                voice[k] = new Int16Array(voice[k]);
            }
        }
        voice.name = this.#get_safe_name(name, null);
        if (!voice.icon) {
            voice.icon = VoicesPage.create_default_icon();
        }
        this.voices.push(voice);
        this.#append(voice);
        this.#select_profile(voice);
        this.db.save_voice(voice, this.voices.length - 1);
    }
    create_export_blob() {
        const v0 = this.selected_voice;
        const v = {};
        for (const k in v0) {
            if (v0[k] instanceof Int16Array) {
                v[k] = Array.from(v0[k]);
            } else if (typeof(v0[k]) !== 'object' && k !== 'name') {
                v[k] = v0[k];
            }
        }
        return new Blob([JSON.stringify(v)]);
    }

    #renumber() {
        for (let i = 0; i < this.voices.length; i++) {
            const elem = this.list.childNodes[i];
            elem.dataset.i = i;
            this.voices[i].elem = elem;
        }
    }
    #append(voice) {
        const img = $e('div', {'class':'voice-item-icon'}, $e('img', {src: voice.icon, alt:''}));
        const name = $e('div', {'class':'voice-name'}, voice.name);
        const close = $e('div', {'class':'voice-item-del'}, create_icon('x'));
        const item = $e('div', {'class':'voice-item', 'data-i':this.list.childNodes.length - 1}, img, name, close);
        item.addEventListener('click', e => {
            if (!item.classList.contains('voice-selected')) {
                const idx = Number.parseInt(e.currentTarget.dataset.i);
                this.#select_profile(this.voices[idx]);
            }
        });
        item.addEventListener('dragstart', e => {
            e.dataTransfer.items.clear();
            e.dataTransfer.items.add(e.currentTarget.dataset.i, 'text/plain');
        });
        item.addEventListener('dragenter', e => {
            e.preventDefault();
        });
        item.addEventListener('dragover', e => {
            e.preventDefault();
        });
        item.addEventListener('drop', e => {
            const data = e.dataTransfer.getData('text/plain');
            if (data) {
                const src = Number.parseInt(data);
                const dst = Number.parseInt(e.currentTarget.dataset.i);
                this.#swap_item(src, dst);
            }
        });
        img.addEventListener('click', async e => {
            if (e.currentTarget.parentNode.classList.contains('voice-selected')) {
                const f = await this.dialog.show_upload('.png, .gif, .jpg, .jpeg', 'test');
                if (f) {
                    VoicesPage.load_icon_file(this.selected_voice, f);
                    this.modified = true;
                    if (this.on_list_change) {
                        this.on_list_change();
                    }
                }
            }
        });
        close.addEventListener('click', e => {
            const idx = Number.parseInt(e.currentTarget.parentNode.dataset.i);
            this.delete_item(idx);
            e.stopPropagation();
        });
        this.list.insertBefore(item, this.item_append);
        voice.elem = item;
        return item;
    }
    #swap_item(src, dst) {
        if (src < dst) {
            const s1 = this.voices.splice(src, 1);
            this.voices.splice(dst, 0, s1[0]);
            this.list.insertBefore(this.list.childNodes[src], this.list.childNodes[dst].nextSibling);
            this.#renumber();
        } else if (src > dst) {
            const s1 = this.voices.splice(src, 1);
            this.voices.splice(dst, 0, s1[0]);
            this.list.insertBefore(this.list.childNodes[src], this.list.childNodes[dst]);
            this.#renumber();
        }
        this.db.save_all_voices(this.voices);
    }
    #select_profile(voice) {
        if (this.modified) {
            const idx = this.voices.indexOf(this.selected_voice);
            this.db.save_voice(this.selected_voice, idx);
            this.modified = false;
        }
        if (this.selected_voice) {
            const item = this.selected_voice.elem;
            this.voice_name.remove();
            item.getElementsByClassName('voice-name')[0].textContent = this.selected_voice.name;
            item.classList.remove('voice-selected');
            item.removeAttribute('draggable');
        }
        voice.elem.classList.add('voice-selected');
        voice.elem.setAttribute('draggable', 'true');
        const voice_name = voice.elem.getElementsByClassName('voice-name')[0];
        voice_name.textContent = '';
        voice_name.appendChild(this.voice_name);

        this.voice_name.value = voice.name;
        this.voice_pitch.value = voice.pitch;
        this.voice_flutter.value = voice.flutter;
        this.voice_fricative.value = voice.fricative;
        this.voice_formant_w.value = voice.width.join('/');
        this.voice_formant_h.value = voice.height.join('/');
        this.voice_formant_f.value = voice.freq.join('/');
        this.voice_formant_a.value = voice.freqadd.join('/');
        this.selected_voice = voice;
    }
    #get_safe_name(n, self) {
        const names = new Set();
        for (const v of this.voices) {
            if (!self || self !== v.name) names.add(v.name);
        }
        if (!names.has(n)) return n;

        const m = n.match(/\-(\d+)$/);
        let s, i;
        if (m) {
            s = n.substring(0, n.length - m[1].length);
            i = Number.parseInt(m[1]) + 1;
        } else {
            s = n + '-';
            i = 1;
        }
        while (true) {
            const t = s + i;
            if (!names.has(t)) return t;
            i++;
        }
    }
    static #parse_formant(input) {
        const a = input.value.split('/');
        const min = Number.parseInt(input.getAttribute('data-min'));
        const max = Number.parseInt(input.getAttribute('data-max'));
        const ret = new Int16Array(7);

        for (let i = 0; i < ret.length; i++) {
            const n = i < a.length ? Number.parseInt(a[i]) : Number.NaN;
            if (Number.isNaN(n)) {
                ret[i] = (min + max) >> 1;
            } else if (n < min) {
                ret[i] = min;
            } else if (n > max) {
                ret[i] = max;
            } else {
                ret[i] = n;
            }
        }
        return ret;
    }
    get_voice() {
        return {
            pitch: Number.parseInt(this.voice_pitch.value),
            flutter: Number.parseInt(this.voice_flutter.value),
            roughness: 1,
            fricative: Number.parseInt(this.voice_fricative.value),
            height: VoicesPage.#parse_formant(this.voice_formant_h),
            width: VoicesPage.#parse_formant(this.voice_formant_w),
            freq: VoicesPage.#parse_formant(this.voice_formant_f),
            freqadd: VoicesPage.#parse_formant(this.voice_formant_a),
        };
    }
    static async load_icon_file(item, file) {
        const image = await window.createImageBitmap(file);
        const cv = document.getElementById('voice-icon');
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(image, 0, 0, cv.width, cv.height);
        item.icon = cv.toDataURL('image/png');
        item.elem.getElementsByTagName('img')[0].setAttribute('src', item.icon);
    }
    static create_default_icon() {
        const cv = document.getElementById('voice-icon');
        const ctx = cv.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = ['#f00', '#080', '#00f', '#c0c', '#bb0', '#888'][(Math.random() * 6) | 0];
        ctx.beginPath();
        ctx.ellipse(16, 12, 8, 8, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(16, 32, 12, 12, 0, 0, 2 * Math.PI);
        ctx.fill();
        return cv.toDataURL('image/png');
    }
}
class ConfigPage
{
    constructor(db, ja_reading, dialog) {
        this.db = db;
        this.filename_single = document.getElementById('wav-filename-single');
        this.filename_seq = document.getElementById('wav-filename-seq');
        this.filename_single.value = this.db.filename_single;
        this.filename_seq.value = this.db.filename_seq;

        this.filename_single.addEventListener('change', e => {
            if (this.db) {
                this.db.filename_single = e.currentTarget.value;
                this.db.config_save();
            }
        });
        this.filename_seq.addEventListener('change', e => {
            if (this.db) {
                this.db.filename_seq = e.currentTarget.value;
                this.db.config_save();
            }
        });
        document.getElementById('dic-import-ja').addEventListener('click', async () => {
            const f = await dialog.show_upload('.txt');
            if (f) {
                const src = await f.text();
                const [alias, dic] = await db.set_ja_dic_file(src.split("\n"));
                ja_reading.load(alias, dic);
                document.getElementById('dic-ja-word-count').textContent = ja_reading.count;
                this.set_button_hilight('dic-import-ja', ja_reading.count === 0);
//#if_module
                this.set_button_hilight('dic-init-ja', ja_reading.count === 0);
//#endif
            }
        });
        document.getElementById('dic-export-ja').addEventListener('click', async () => {
            const f = await db.get_ja_dic_as_file();
            dialog.show_download(f, 'dic_ja.txt');
        });
//#if_module
        document.getElementById('dic-init-ja').addEventListener('click', async () => {
            const res = await fetch('./files/dict_ja.txt');
            if (!res.ok) {
                document.getElementById('dic-ja-word-count').textContent = `Error: responce=${res.status}`;
            } else {
                const src = await res.text();
                const [alias, dic] = await db.set_ja_dic_file(src.split("\n"));
                ja_reading.load(alias, dic);
                document.getElementById('dic-ja-word-count').textContent = ja_reading.count;
                this.set_button_hilight('dic-import-ja', ja_reading.count === 0);
                this.set_button_hilight('dic-init-ja', ja_reading.count === 0);
            }
        });
//#endif
        document.getElementById('initialize-db').addEventListener('click', () => {
            dialog.show_delete_conform(db);
        });
    }
    set_button_hilight(id, hilight) {
        const btn = document.getElementById(id);
        if (hilight) {
            btn.classList.add('button-hilight');
        } else {
            btn.classList.remove('button-hilight');
        }
    }
}
class LanguagePage
{
    static get_resource(lang) {
        const res = {
            'en': {
                'UI': 'en-US',

                'tts': 'Text to Speech',
                'voices': 'Voices',
                'config': 'Settings',
                'help': 'Help',
                'new-proj': 'New Project',
                'open-proj': 'Open Project',
                'save-proj': 'Save Project',
                'save-as': 'Save Project as',
                'manage-proj': 'File Manager',
                'import-file': 'Import File',
                'export-file': 'Export File',
                'ok':'OK',
                'open':'Open',
                'save':'Save',
                'cancel':'Cancel',
                'close':'Close',
                'execute': 'Execute',

                'upload-area1': 'Drop the file here',
                'upload-area2': 'Click here to choose the file',

                'tts-speed': 'Speed',
                'tts-pitch': 'Pitch',
                'tts-accent': 'Accent',
                'tts-volume': 'Volume',
                'voice-sample-ja': 'Listen (Japanese)',
                'warning-laud': 'Intensity noise may occur under certain parameters.',
                'wav-filename': 'WAV Filename',
                'filename-single': 'Single',
                'filename-seq': 'Series',
                'dictionary-ja': 'Dictionary (Japanese)',
                'load-dic': 'Load the Dictionary',
                'initialize-db': 'Initialize IndexedDB',
                'delete-all': 'Warning: Pressing this button will delete all stored data.',
                'confirm-delete-all': 'Are you sure to delete all stored data?',
                'delete-complete': 'All stored data has been deleted. Please close this page.',
                'ninbos-voice-intro': 'NinbosVoice is a speech synthesizer works on a web browser.',
                'supported-browsers': 'Supported Browsers',
                'terms-of-use': 'Terms of Use',
                'tou-no-warranty': 'We assume no liability whatsoever for any damages arising from the use of this software or the inability to use it.',
                'tou-audio-use': 'The generated audio may be used for both commercial and non-commercial purposes. Please use it at your own risk.',
                'tou-beta-release': 'This software is a beta version. Please be aware that data created previously may become unavailable.',
                'software-license': 'Software License',
                'language-support-info': 'English speech synthesis is not yet available.',
                'software-descript1': 'NinbosVoice is released under the GPL version 3 license.',
                'software-descript2': 'This product uses modified portions of the eSpeak NG source code and audio data.',
            },
            'ja': {
                'UI': 'ja-JP',

                'tts': '読み上げ',
                'voices': 'キャラクター',
                'config': '設定',
                'help': 'ヘルプ',
                'new-proj': '新規プロジェクト',
                'open-proj': 'プロジェクトを開く',
                'save-proj': 'プロジェクトを保存',
                'save-as': 'プロジェクトを別名で保存',
                'manage-proj': 'ファイルマネージャー',
                'import-file': 'ファイル取り込み',
                'export-file': 'ファイルに保存',
                'open':'開く',
                'save':'保存',
                'cancel':'キャンセル',
                'close':'閉じる',
                'execute': '実行',

                'upload-area1': 'ファイルをここにドロップ',
                'upload-area2': 'ここをクリックしてファイルを選択',

                'tts-speed': '話速',
                'tts-pitch': '音高',
                'tts-accent': '抑揚',
                'tts-volume': '音量',
                'voice-sample-ja': '試聴',
                'warning-laud': 'パラメーターによっては激しいノイズが発生する場合があります。',
                'wav-filename': 'WAV ファイル名',
                'filename-single': '単独',
                'filename-seq': '連番',
                'dictionary-ja': '辞書',
                'load-dic': '辞書を読み込む',
                'initialize-db': 'IndexedDB の初期化',
                'delete-all': '警告: ボタンを押すと保存されているすべてのデータを削除します。',
                'confirm-delete-all': '保存されているすべてのデータを削除してもよろしいですか？',
                'delete-complete': '保存されているすべてのデータは削除されました。このままページを閉じてください。',
                'ninbos-voice-intro': 'NinbosVoice は、ブラウザで動作する音声合成ソフトウェアです。',
                'supported-browsers': '対応ブラウザ',
                'terms-of-use': '利用規約',
                'tou-no-warranty': '本ソフトウェアの使用、もしくは使用不能によって生じた損害の責任は一切負いません。',
                'tou-audio-use': '作成した音声は商用・非商用問わず利用できます。ご自身の責任でご使用ください。',
                'tou-beta-release': '本ソフトウェアはベータ版です。作成したデータが使用できなくなる可能性があることをご了承ください。',
                'software-license': 'ソフトウェアライセンス',
                'language-support-info': '',
                'software-descript1': 'NinbosVoice は GPL version 3 ライセンスが適用されます。',
                'software-descript2': '本ソフトウェアは eSpeak NG のソースコード・音声データの一部を改変して利用しています。',
            },
            'zh': {
                'UI': 'zh',

                'tts': '文字转语音',
                'voices': '声音个性',
                'config': '设置',
                'help': '帮助',
                'new-proj': '新建工程',
                'open-proj': '打开工程',
                'save-proj': '储存工程',
                'save-as': '将工程另存为',
                'manage-proj': '文件管理器',
                'import-file': '从文件导入',
                'export-file': '导出到文件',
                'ok':'确定',
                'cancel':'取消',
                'close':'关闭',
                'open':'打开',
                'save':'储存',
                'execute': '执行',

                'upload-area1': '在此处拖放文件',
                'upload-area2': '单击此处以选择文件',

                'tts-speed': '语速',
                'tts-pitch': '音高',
                'tts-accent': '重音',
                'tts-volume': '音量',
                'voice-sample-ja': '预听 (日语)',
                'warning-laud': '在特定参数下，可能会出现强度噪声。',
                'wav-filename': 'WAV 文件名',
                'filename-single': '单个',
                'filename-seq': '连载',
                'dictionary-ja': '词典 (日语)',
                'load-dic': '加载词典',
                'initialize-db': '初始化 IndexedDB',
                'delete-all': '警告: 按下此按钮将删除所有已存储的数据。',
                'confirm-delete-all': '您确定要删除所有已存储的数据吗？',
                'delete-complete': '所有已存储的数据均已删除。请关闭此页面。',
                'ninbos-voice-intro': 'NinbosVoice 是在网页浏览器上运行的语音合成器。',
                'supported-browsers': '浏览器支持',
                'terms-of-use': '使用条款',
                'software-license': '软件许可',
                'language-support-info': '中文语音合成功能尚无法使用。',
                'software-descript1': 'NinbosVoice 基于 GPL 第 3 版本许可证发布。',
                'software-descript2': '本软件使用了 eSpeak NG 源代码和音频数据中部分内容的修改版本。',
            },
            'zh-hant': {
                'UI': 'zh-Hant',

                'tts': '文字轉語音',
                'voices': '聲音個性',
                'config': '設置',
                'help': '幫助',
                'new-proj': '新建工程',
                'open-proj': '打開工程',
                'save-proj': '儲存工程',
                'save-as': '將工程另存為',
                'manage-proj': '文件管理器',
                'import-file': '從文件導入',
                'export-file': '匯出到文件',
                'ok':'確定',
                'cancel':'取消',
                'close':'關閉',
                'open':'打開',
                'save':'儲存',
                'execute': '執行',

                'upload-area1': '在此處拖放文件',
                'upload-area2': '單擊這裡以選擇文件',

                'tts-speed': '語速',
                'tts-pitch': '音高',
                'tts-accent': '重音',
                'tts-volume': '音量',
                'voice-sample-ja': '預聽 (日語)',
                'warning-laud': '在特定參數下，可能會出現強度噪音。',
                'wav-filename': 'WAV 檔案名稱',
                'filename-single': '單個',
                'filename-seq': '序號',
                'dictionary-ja': '詞典 (日語)',
                'load-dic': '載入詞典',
                'initialize-db': '初始化 IndexedDB',
                'delete-all': '警告: 按下此按鈕將刪除所有已儲存的資料。',
                'confirm-delete-all': '您確定要刪除所有已儲存的資料嗎？',
                'delete-complete': '所有已儲存的資料均已刪除。請關閉此頁面。',
                'supported-browsers': '瀏覽器支持',
                'terms-of-use': '使用條款',
                'ninbos-voice-intro': 'NinbosVoice 是在網頁瀏覽器上運行的語音合成器。',
                'software-license': '軟件授權條款',
                'language-support-info': '中文語音合成功能尚無法使用。',
                'software-descript1': 'NinbosVoice 根據 GPL 版本 3 版本的授權協議發布。',
                'software-descript2': '本軟件使用了 eSpeak NG 原始碼和音訊資料的修改版本。',
            },
        };
        const r = res[lang];
        if (lang !== 'en') {
            for (const k in res.en) {
                if (!(k in r)) r[k] = res.en[k];
            }
        }
        return r;
    }

    constructor() {
        const lang = LanguagePage.#get_default_lang();
        const lang_select = document.getElementById('setting-language');
        lang_select.value = lang;
        lang_select.addEventListener('change', e => {
            this.#select(e.currentTarget.value);
        });
        this.#select(lang);
    }
    static #get_default_lang() {
        const list = [
            'en', 'ja', 'zh',
        ];
        const zh_hant = [
            'zh-tw', 'zh-hk', 'zh-mo'
        ];
        for (const ln of window.navigator.languages) {
            const k = ln.toLowerCase();
            if (zh_hant.indexOf(k) >= 0) {
                return 'zh-hant';
            }
            const s = k.split('-')[0];
            if (list.indexOf(s) >= 0) {
                return s;
            }
        }
        return 'en';
    }
    #select(lang) {
        this.res = LanguagePage.get_resource(lang);
        document.body.setAttribute('lang', this.res.UI);
        LanguagePage.#update_text(document.body, this.res);
    }
    static #update_text(node, res) {
        for (let elem of node.childNodes) {
            if (elem instanceof Element) {
                const k = elem.dataset.res;
                if (k in res) {
                    elem.textContent = res[k];
                } else {
                    LanguagePage.#update_text(elem, res);
                }
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', async () =>
{
    const db = await SettingDB.open();

    const ja_reading = new JaReading();
    const player = new WavPlayer(SAMPLING_RATE, 0.4, 0.9);
    const lang_page = new LanguagePage();
    const dialog = new FileDialogSet(lang_page);
    const voices_page = new VoicesPage(db, player, dialog);
    const tts_page = new TtsPage(db, voices_page.voices, dialog, player, ja_reading);
    const config_page = new ConfigPage(db, ja_reading, dialog);

    voices_page.set_change_handler(() => tts_page.refresh_icon = true);
    {
        const [alias, dic] = await db.get_ja_dic();
        ja_reading.load(alias, dic);
        document.getElementById('dic-ja-word-count').textContent = ja_reading.count;
        config_page.set_button_hilight('dic-import-ja', ja_reading.count === 0);
//#if_module
        config_page.set_button_hilight('dic-init-ja', ja_reading.count === 0);
//#endif
    }

    const tab = new TabPage((prev, key) => {
        const btn_key = 'sub-' + key;
        for (const btn of document.getElementById('sub').getElementsByTagName('button')) {
            btn.style.display = btn.classList.contains(btn_key) ? '' : 'none';
        }
        if (prev === 'tts') {
            tts_page.hide();
        } else if (prev === 'voices') {
            voices_page.hide();
        }
        if (key === 'tts') {
            tts_page.show();
        } else if (key === 'voices') {
            voices_page.show();
        }
    });
    if (ja_reading.count > 0) {
        tab.init('tts');
    } else {
        tab.init('config');
    }

    document.getElementById('sub-undo').addEventListener('click', () => {
        switch (tab.current_page) {
        case 'tts':
            tts_page.on_undo();
            break;
        case 'voices':
            voices_page.on_undo();
            break;
        }
    });
    document.body.style.display = 'grid';
});
