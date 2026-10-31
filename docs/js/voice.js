import { SAMPLING_RATE, VoiceSynth } from '../lib/vsynth.js';
import { parse_dictionary } from '../lib/misc.js';
import { DataHolder } from './db.js';
import { WavPlayer } from './player.js';
import { FileDialogSet } from './dialog.js';
import { speech_langs, resources } from './lang.js';
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
        'fLnv +30 fv 7 ! 5 p0 0 +10 A 7 A8',
        'Fnv +60 f5o9v 7 ! 5 p',
        'Fv0c5s +40 c5s +10 v0c0 +10 f5o9v 7 ! 5 p0',
        '=0.8 f0nv 7 ! 5 p0',
        'L7o2v0c +40 v0 +10 o5L7v 7 ! 5 p0',
        '=0.8 Fnv 7 ! 5 p5',
        'fnv +30 fv 7 ! 5 p5',
        'Fv0cs +20 fv0c3s +40 v0 +10 fv 7 ! 5 p5',
        'f5L8v +50 f5o9v 7 ! 5 p5 7 A8',
        '.'];

    static #create_number(key, i, min, max) {
        return $e('input', {type:'number', min, max, step:'10', size:'4', 'data-key':key, 'data-i':i});
    }
    static #set_formant_values(tr, values) {
        let i = 0;
        for (const input of tr.getElementsByTagName('input')) {
            input.value = values[i];
            i++;
        }
    }

    constructor(db, voices, player, lang, dialog) {
        this.db = db;
        this.player = player;
        this.lang = lang;
        this.dialog = dialog;
        this.list = document.getElementById('voices-list');
        this.item_append = document.getElementById('voice-item-add');
        this.update_btn = document.getElementById('sub-voice-update');

        this.voice_icon = document.getElementById('voice-icon');
        this.voice_name = document.getElementById('voice-name');
        this.voice_pitch = document.getElementById('voice-pitch');
        this.voice_flutter = document.getElementById('voice-flutter');
        this.voice_fricative = document.getElementById('voice-fricative');

        this.voice_formant_h = document.getElementById('voice-formant-h');
        this.voice_formant_w = document.getElementById('voice-formant-w');
        this.voice_formant_f = document.getElementById('voice-formant-f');
        this.voice_formant_a = document.getElementById('voice-formant-a');

        this.selected_voice = null;
        this.on_list_change = null;

        if (voices.length === 0) {
            const v = {
                name: 'default',
                icon: VoicesPage.create_default_icon(this.voice_icon),
                ...VoiceSynth.default_voice(),
            };
            voices.push(v);
            this.db.save_voice(v, 0);
        }
        this.voices = voices;

        const fmt_header = document.getElementById('voice-formant-header');
        for (let i = 0; i < 7; i++) {
            fmt_header.appendChild($e('th', null, `F${i + 1}`));
            this.voice_formant_h.appendChild($e('td', null, VoicesPage.#create_number('height', i, 0, 300)));
            this.voice_formant_w.appendChild($e('td', null, VoicesPage.#create_number('width', i, 10, 1000)));
            this.voice_formant_f.appendChild($e('td', null, VoicesPage.#create_number('freq', i, 10, 500)));
            this.voice_formant_a.appendChild($e('td', null, VoicesPage.#create_number('freqadd', i, -600, 600)));
        }

        for (const v of this.voices) {
            this.#append(v);
        }
        this.#select_profile(this.voices[0]);

        this.list.addEventListener('click', e => {
            let elem;
            if ((elem = e.target.closest('.voice-item-del')) !== null) {
                const idx = Number.parseInt(elem.parentNode.dataset.i);
                this.delete_item(idx);
            } else if ((elem = e.target.closest('.voice-item')) !== null) {
                if (!elem.classList.contains('voice-selected')) {
                    const idx = Number.parseInt(elem.dataset.i);
                    this.#select_profile(this.voices[idx]);
                }
            }
        });
        this.list.addEventListener('dragstart', e => {
            const elem = e.target.closest('.voice-item');
            if (elem !== null) {
                e.dataTransfer.items.clear();
                e.dataTransfer.items.add(elem.dataset.i, 'text/plain');
            }
        });
        this.list.addEventListener('dragenter', e => {
            e.preventDefault();
        });
        this.list.addEventListener('dragover', e => {
            e.preventDefault();
        });
        this.list.addEventListener('drop', e => {
            const elem = e.target.closest('.voice-item');
            const data = e.dataTransfer.getData('text/plain');
            if (elem !== null && data !== null) {
                const src = Number.parseInt(data);
                const dst = Number.parseInt(elem.dataset.i);
                this.#swap_item(src, dst);
            }
        });
        this.voice_icon.addEventListener('click', () => {
            this.#select_voice_icon();
        });
        document.getElementById('voice-profile').addEventListener('change', e => {
            const elem = e.target.closest('input');
            if (elem !== null) {
                if (elem.getAttribute('type') === 'number') {
                    this.#update_number_input(elem);
                } else {
                    elem.value = this.#get_safe_name(elem.value, this.selected_voice.name);
                }
                this.update_btn.disabled = false;
            }
        });
        this.update_btn.addEventListener('click', () => {
            const item = this.selected_voice;
            const idx = Number.parseInt(item.elem.dataset.i);
            this.#update_profile(item, idx);
        });
        this.item_append.addEventListener('click', () => {
            this.create_new_voice();
        });

        document.getElementById('voice-sample-ja').addEventListener('click', e => {
            const t = e.currentTarget;
            t.disabled = true;
            this.#play_sample(t);
        });
        document.getElementById('sub-import-file').addEventListener('click', async () => {
            const f = await this.dialog.show_upload('.json')
            if (f) this.import_file(f);
        });
        document.getElementById('sub-export-file').addEventListener('click', () => {
            this.dialog.show_download(this.create_export_blob(), this.selected_voice.name + '.json');
        });
    }

    #update_number_input(t) {
        const val = Number.parseInt(t.value);
        const min = Number.parseInt(t.min);
        const max = Number.parseInt(t.max);
        if (Number.isNaN(val)) {
            t.value = min;
        } else if (val < min) {
            t.value = min;
        } else if (val > max) {
            t.value = max;
        }
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
    }
    hide() {
        this.#select_profile(this.selected_voice);
    }
    create_new_voice() {
        const voice = {
            icon: VoicesPage.create_default_icon(this.voice_icon),
            ...VoiceSynth.default_voice()
        };
        voice.name = this.#get_safe_name('Untitled', null);
        this.voices.push(voice);
        this.#append(voice);
        this.#select_profile(voice);
        this.db.save_voice(voice, this.voices.length - 1);
    }
    async delete_item(idx) {
        if (this.voices.length === 1) return;
        if (!await this.dialog.show_confirm(this.lang.res['confirm-delete-voice'].replace('{0}', this.voices[idx].name))) return;

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
        voice.name = this.#get_safe_name(name, null);
        if (!voice.icon) {
            voice.icon = VoicesPage.create_default_icon(this.voice_icon);
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
            if (v0[k] instanceof Array || (typeof(v0[k]) !== 'object' && k !== 'name')) {
                v[k] = v0[k];
            }
        }
        return new Blob([JSON.stringify(v)]);
    }

    #update_profile(item, idx) {
        const voice = this.get_voice();
        for (const k in voice) {
            item[k] = voice[k];
        }
        item.icon = this.voice_icon.toDataURL('image/png');
        item.name = this.voice_name.value;

        item.elem.getElementsByTagName('img')[0].src = item.icon;
        item.elem.getElementsByClassName('voice-name')[0].textContent = item.name;
        this.db.save_voice(item, idx);
        this.update_btn.disabled = true;
        if (this.on_list_change) {
            this.on_list_change();
        }
    }
    #renumber() {
        for (let i = 0; i < this.voices.length; i++) {
            const elem = this.list.childNodes[i];
            elem.dataset.i = i;
            this.voices[i].elem = elem;
        }
    }
    async #select_voice_icon() {
        const f = await this.dialog.show_upload('.png, .gif, .jpg, .jpeg', 'test');
        if (f !== null) {
            VoicesPage.load_icon_file(this.voice_icon, f);
            this.update_btn.disabled = false;
        }
    }
    #append(voice) {
        const item = $e('div', {'class':'voice-item', 'data-i':this.list.childNodes.length - 1},
            $e('div', {'class':'voice-item-icon'}, $e('img', {src: voice.icon, alt:''})),
            $e('div', {'class':'voice-name'}, voice.name),
            $e('div', {'class':'voice-item-del'}, create_icon('x')));
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
    async #select_profile(voice) {
        if (voice !== this.selected_voice) {
            if (this.selected_voice) {
                const item = this.selected_voice.elem;
                item.classList.remove('voice-selected');
                item.removeAttribute('draggable');
            }
            voice.elem.classList.add('voice-selected');
            voice.elem.setAttribute('draggable', 'true');
            this.selected_voice = voice;
        }

        this.voice_name.value = voice.name;
        this.voice_pitch.value = voice.pitch;
        this.voice_flutter.value = voice.flutter;
        this.voice_fricative.value = voice.fricative;
        VoicesPage.#set_formant_values(this.voice_formant_w, voice.width);
        VoicesPage.#set_formant_values(this.voice_formant_h, voice.height);
        VoicesPage.#set_formant_values(this.voice_formant_f, voice.freq);
        VoicesPage.#set_formant_values(this.voice_formant_a, voice.freqadd);
        this.update_btn.disabled = true;

        const res = await fetch(voice.icon);
        const blob = await res.blob();
        const image = await window.createImageBitmap(blob);
        const ctx = this.voice_icon.getContext('2d');
        ctx.clearRect(0, 0, this.voice_icon.width, this.voice_icon.height);
        ctx.drawImage(image, 0, 0, this.voice_icon.width, this.voice_icon.height);
    }
    #get_safe_name(n, self) {
        const names = new Set();
        for (const v of this.voices) {
            if (!self || self !== v.name) names.add(v.name);
        }
        if (!names.has(n)) return n;

        const m = n.match(/-(\d+)$/);
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
    static #get_formant_values(tr) {
        const ret = [];
        for (const input of tr.getElementsByTagName('input')) {
            ret.push(Number.parseInt(input.value));
        }
        return ret;
    }
    get_voice() {
        return {
            pitch: Number.parseInt(this.voice_pitch.value),
            flutter: Number.parseInt(this.voice_flutter.value),
            roughness: 1,
            fricative: Number.parseInt(this.voice_fricative.value),
            height: VoicesPage.#get_formant_values(this.voice_formant_h),
            width: VoicesPage.#get_formant_values(this.voice_formant_w),
            freq: VoicesPage.#get_formant_values(this.voice_formant_f),
            freqadd: VoicesPage.#get_formant_values(this.voice_formant_a),
        };
    }
    static async load_icon_file(cv, file) {
        const image = await window.createImageBitmap(file);
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(image, 0, 0, cv.width, cv.height);
    }
    static create_default_icon(cv) {
        const ctx = cv.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = '#888';
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
    constructor(db, dialog) {
        this.db = db;
        this.filename_single = document.getElementById('wav-filename-single');
        this.filename_seq = document.getElementById('wav-filename-seq');
        this.filename_single.value = this.db.filename_single;
        this.filename_seq.value = this.db.filename_seq;

        this.filename_single.addEventListener('change', e => {
            this.db.config_save('filename_single', e.currentTarget.value);
        });
        this.filename_seq.addEventListener('change', e => {
            this.db.config_save('filename_seq', e.currentTarget.value);
        });

        const dic_list = document.getElementById('config-dic-list');
        this.word_counts = {};
        for (const k in speech_langs) {
            const row = speech_langs[k];
            if (row.use_dic) {
                const count = $e('span', {'data-lang':k});
                this.word_counts[k] = count;
                const tr = $e('tr', null,
                    $e('th', {'data-res':k}),
                    $e('td', null,
                        $e('button', {'class':'config-dic-import', 'data-res':'import-file', 'data-lang': k}),
                        $e('button', {'class':'config-dic-export', 'data-res':'export-file', 'data-lang': k}),
//#if_module
                        $e('button', {'class':'config-dic-load', 'data-res':'load-dic', 'data-lang': k}),
//#endif
                    ),
                    $e('td', null, count),
                );
                dic_list.appendChild(tr);
                db.get_dic_count(k).then(n => {
                    count.textContent = n === 0 ? 'Empty' : n;
                    ConfigPage.#set_button_hilight(tr, n === 0);
                });
            }
        }

        dic_list.addEventListener('click', async e => {
            const target = e.target;
            const row = target.closest('tr');
            const lang = target.dataset.lang;
            const speech_lang = speech_langs[lang];
            if (target.classList.contains('config-dic-import')) {
                const f = await dialog.show_upload('.txt');
                if (f !== null) {
                    ConfigPage.#enable_dic_buttons(false);
                    const src = await f.text();
                    if (!speech_lang.is_loaded()) {
                        await speech_lang.load();
                    }
                    const dic = parse_dictionary(src);
                    await db.set_dic(lang, dic);
                    speech_lang.to_phonemic.load(dic);
                    row.getElementsByTagName('span')[0].textContent = speech_lang.to_phonemic.count;
                    ConfigPage.#set_button_hilight(row, speech_lang.to_phonemic.count === 0);
                    ConfigPage.#enable_dic_buttons(true);
                }
            } else if (target.classList.contains('config-dic-export')) {
                const f = await db.get_dic_as_file(lang);
                dialog.show_download(f, `dict_${lang}.txt`);
//#if_module
            } else if (target.classList.contains('config-dic-load')) {
                ConfigPage.#enable_dic_buttons(false);
                const res = await fetch(`./files/dict_${lang}.txt`);
                if (res.ok) {
                    const src = await res.text();
                    if (!speech_lang.is_loaded()) {
                        await speech_lang.load();
                    }
                    const dic = parse_dictionary(src);
                    await db.set_dic(lang, dic);
                    speech_lang.to_phonemic.load(dic);
                    row.getElementsByTagName('span')[0].textContent = speech_lang.to_phonemic.count;
                    ConfigPage.#set_button_hilight(row, speech_lang.to_phonemic.count === 0);
                } else {
                    row.getElementsByTagName('span')[0].textContent = `Error: responce=${res.status}`;
                }
                ConfigPage.#enable_dic_buttons(true);
//#endif
            }
        });

        document.getElementById('initialize-db').addEventListener('click', () => {
            dialog.show_delete_conform(db);
        });
    }

    static #set_button_hilight(row, hilight) {
        const btn1 = row.getElementsByClassName('config-dic-import')[0];
        if (hilight) {
            btn1.classList.add('button-hilight');
        } else {
            btn1.classList.remove('button-hilight');
        }
//#if_module
        const btn2 = row.getElementsByClassName('config-dic-load')[0];
        if (hilight) {
            btn2.classList.add('button-hilight');
        } else {
            btn2.classList.remove('button-hilight');
        }
//#endif
    }

    static #enable_dic_buttons(enabled) {
        for (const button of document.getElementById('config-dic-list').getElementsByTagName('button')) {
            button.disabled = !enabled;
        }
    }

    show() {
    }
    hide() {
    }
}
class LanguagePage
{
    static #get_resource(lang) {
        const r = resources[lang];
        if (lang !== 'en') {
            const en = resources.en;
            for (const k in en) {
                if (!(k in r)) r[k] = en[k];
            }
        }
        return r;
    }
    static #get_default_lang() {
        const zh_hant = ['zh-tw', 'zh-hk', 'zh-mo'];

        for (const ln of window.navigator.languages) {
            const k = ln.toLowerCase();
            if (zh_hant.indexOf(k) >= 0) {
                return 'zh-hant';
            }
            const s = k.split('-')[0];
            if (s in resources) {
                return s;
            }
        }
        return 'en';
    }

    constructor(db) {
        this.db = db;
        this.lang = db.lang !== '' ? db.lang : LanguagePage.#get_default_lang();
        const lang_select = document.getElementById('setting-language');
        lang_select.value = this.lang;
        lang_select.addEventListener('change', e => {
            this.lang = e.currentTarget.value;
            this.res = LanguagePage.#get_resource(this.lang);
            this.update();
            this.db.config_save('lang', this.lang);
        });
        if (db.lang !== '') db.config_save('lang', this.lang);
        this.res = LanguagePage.#get_resource(this.lang);
    }
    update() {
        document.body.setAttribute('lang', this.res.UI);
        LanguagePage.#update_text(document.body, this.res);
    }
    get_speech_lang() {
        return speech_langs[this.res['speech-lang']]
    }
    show() {
    }
    hide() {
    }

    static #update_text(node, res) {
        for (const elem of node.childNodes) {
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
    const db = await DataHolder.open();

    const player = new WavPlayer(SAMPLING_RATE, 0.4, 0.9);
    const lang_page = new LanguagePage(db);
    const dialog = new FileDialogSet(lang_page);
    const voices_page = new VoicesPage(db, await db.get_voices(), player, lang_page, dialog);
    const tts_page = new TtsPage(db, voices_page.voices, dialog, lang_page.get_speech_lang(), player);
    const config_page = new ConfigPage(db, dialog);

    lang_page.update();
    {
        const lang = lang_page.get_speech_lang();
        await lang.load();
        lang.to_phonemic.load(await db.get_dic(lang.tag));
    }
    voices_page.on_list_change = () => tts_page.refresh_icon = true;

    const pages = {
        tts: tts_page,
        voices: voices_page,
        config: config_page,
        language: lang_page,
    };

    const tab = new TabPage((prev, key) => {
        const btn_key = 'sub-' + key;
        for (const btn of document.getElementById('sub').getElementsByTagName('button')) {
            btn.style.display = btn.classList.contains(btn_key) ? '' : 'none';
        }
        const prev_page = pages[prev];
        if (prev_page) prev_page.hide();
        const current_page = pages[key];
        if (current_page) current_page.show();
    });
    tab.init('tts');
    document.body.style.display = 'grid';
});
