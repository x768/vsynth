import { JaToPFN } from '../lib/phone_ja.js';
import { SAMPLING_RATE, VoiceSynth } from '../lib/vsynth.js';
import { WavFile } from '../lib/wavfile.js';
import { SpeechNote } from './note.js';
import { create_icon } from './voice.js';
import { $e } from './utils.js';

class TtsItem
{
    static from_json_object(obj, voice) {
        const item = new TtsItem(voice);
        this.lang = obj.lang;
        item.text = obj.text;
        item.phonetic = obj.phonetic;
        item.speed = obj.speed;
        item.pitch = obj.pitch;
        item.accent = obj.accent;
        item.volume = obj.volume;
        item.pfn = obj.pfn;
        item.text_area.textContent = item.get_text();
        return item;
    }
    constructor(voice) {
        this.elem = $e('div', {'class': 'tts-item', draggable:'true'});
        this.text_area = $e('div', null, '');
        this.voice_anchor = $e('div');
        this.voice_select = $e('div', {'class': 'tts-voice-select'}, this.voice_anchor, $e('img', {width:32, height:32}));
        this.close_button = $e('div', {'class': 'tts-item-del'}, create_icon('x'));
        this.elem.appendChild(this.voice_select);
        this.elem.appendChild(this.text_area);
        this.elem.appendChild(this.close_button);

        this.voice = voice;
        this.lang = 'ja';
        this.text = '';
        this.phonetic = '';
        this.speed = 480;
        this.pitch = 0;
        this.accent = 400;
        this.volume = 100;
        this.pfn = [];
        this.set_image(voice.icon);
    }
    set_image(data_uri) {
        this.elem.getElementsByTagName('img')[0].setAttribute('src', data_uri);
    }
    begin_edit(edit_root) {
        this.text_area.textContent = '';
        this.text_area.appendChild(edit_root);
    }
    end_edit(edit_root) {
        edit_root.remove();
        this.text_area.textContent = this.text !== '' ? this.text : this.phonetic;
    }
    select() {
        this.elem.classList.add('tts-selected');
    }
    unselect() {
        this.elem.classList.remove('tts-selected');
    }
    get_index() {
        return Number.parseInt(this.elem.dataset.i);
    }
    is_selected() {
        return this.elem.classList.contains('tts-selected');
    }
    get_text() {
        return this.text !== '' ? this.text : this.phonetic;
    }
    to_json_object() {
        return {
            voice: this.voice.name,
            lang: this.lang,
            text: this.text,
            phonetic: this.phonetic,
            speed: this.speed,
            pitch: this.pitch,
            accent: this.accent,
            volume: this.volume,
            pfn: this.pfn,
        };
    }
}
class NumberControl
{
    constructor(id) {
        this.num = document.getElementById(id + '-t');
        this.range = document.getElementById(id + '-r');
        this.range.min = this.num.min;
        this.range.max = this.num.max;
        this.range.value = this.num.value;

        this.num.addEventListener('change', () => {
            this.range.value = this.num.value;
        });
        this.range.addEventListener('change', () => {
            this.num.value = this.range.value;
        });
    }
    set(val) {
        const min = Number.parseInt(this.num.min);
        const max = Number.parseInt(this.num.max);
        if (val < min) {
            val = min;
        } else if (val > max) {
            val = max;
        }
        this.num.value = val;
        this.range.value = val;
    }
    get() {
        return Number.parseInt(this.num.value);
    }
    enable(b) {
        this.range.disabled = !b;
        this.num.disabled = !b;
    }
}
export class TtsPage
{
    constructor(db, voices, dialog, player, ja_reading) {
        this.db = db;
        this.voices = voices;
        this.dialog = dialog;
        this.player = player;
        this.ja_reading = ja_reading;
 
        this.list = document.getElementById('tts-list');
        this.sub_undo = document.getElementById('sub-undo');
        this.sub_redo = document.getElementById('sub-redo');
        this.sub_save = document.getElementById('sub-save-proj');
        const sub_open = document.getElementById('sub-open-proj');
        const sub_save_as = document.getElementById('sub-save-as');
        const sub_manage = document.getElementById('sub-manage-proj');
        this.filename_area = document.getElementById('filename');
        const template = document.getElementById('tts-editor-template').content;
        this.edit_root = template.getElementById('tts-editor');
        this.edit_text = template.getElementById('tts-text-src');
        this.edit_phonetic = template.getElementById('tts-text-phonetic');
        this.tts_speed = new NumberControl('tts-speed');
        this.tts_pitch = new NumberControl('tts-pitch');
        this.tts_accent = new NumberControl('tts-accent');
        this.tts_volume = new NumberControl('tts-volume');
        this.play_mark = document.getElementById('tts-play-mark');
        this.stop_mark = document.getElementById('tts-stop-mark');
        this.pfn_edit = document.getElementById('tts-pfn-edit');
        this.item_append = document.getElementById('tts-item-add');
        this.parameter = document.getElementById('tts-parameter');
        this.voice_select = document.getElementById('tts-voice-select');
        this.play_button = document.getElementById('tts-play-stop');
        this.wavefile_button = document.getElementById('tts-wav-download');
        this.wavefiles_button = document.getElementById('tts-wavs-download');

        this.items = [];
        this.editing_item = null;
        this.selected_pfn = -1;
        this.pfn_edit.disabled = true;
        this.refresh_icon = false;
        this.last_select = null;
        this.filename = '';

        this.item_append.addEventListener('click', () => {
            for (const it of this.items) {
                it.unselect();
            }
            const new_item = this.#add_item(new TtsItem(this.voices[0]));
            new_item.select();
            this.#begin_edit(new_item);
        });

        this.edit_text.addEventListener('change', () => {
            this.edit_phonetic.value = this.ja_reading.conv(this.edit_text.value);
            this.#set_pfn();
            this.#set_note();
            this.#enable_player_buttons();
        });
        this.edit_text.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                this.edit_phonetic.focus();
                this.#enable_player_buttons();
            } else if (e.key === 'Escape') {
                this.#end_edit();
            }
        });
        this.edit_phonetic.addEventListener('change', () => {
            this.#set_pfn();
            this.#set_note();
            this.#enable_player_buttons();
        });
        this.edit_phonetic.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                this.#enter_line_done();
                this.#enable_player_buttons();
            } else if (e.key === 'Escape') {
                this.#end_edit();
            }
        });
        this.pfn_edit.addEventListener('change', e => {
            if (this.selected_pfn !== -1) {
                this.editing_item.pfn[this.selected_pfn] = e.currentTarget.value;
                this.#set_note_main([this.editing_item], true);
            }
        });
        this.play_button.addEventListener('click', () => {
            if (this.is_playing) {
                this.player.stop();
            } else {
                this.#play();
            }
        });
        this.wavefile_button.addEventListener('click', () => {
            this.#wavfile_download();
        });
        this.wavefiles_button.addEventListener('click', () => {
            this.#wavfile_download_list();
        });
        sub_open.addEventListener('click', async () => {
            const list = await this.db.get_all_projects();
            this.dialog.select_project(list, false)
            .then(f => {
                if (f) {
                    let found = null;
                    for (const pj of list) {
                        if (pj.name === f) {
                            found = pj.value;
                            break;
                        }
                    }
                    this.set_filename(f);
                    this.#load_json_object(found);
                }
            });
        });
        this.sub_save.addEventListener('click', () => {
            if (this.filename !== '') {
                this.db.save_project(this.filename, this.#save_json_object());
            } else {
                sub_save_as.click();
            }
        });
        sub_save_as.addEventListener('click', async () => {
            const list = await this.db.get_all_projects();
            this.dialog.select_project(list, true)
            .then(f => {
                if (f) {
                    this.set_filename(f);
                    this.db.save_project(f, this.#save_json_object());
                }
            });
        });
        sub_manage.addEventListener('click', async () => {
            const list = await this.db.get_all_projects();
            this.dialog.manage_project(list, this.db);
        });
        document.body.addEventListener('keydown', e => {
            switch (e.code) {
            case 'ShiftLeft': case 'ShiftRight':
                this.shiftkey = true;
                break;
            case 'ControlLeft': case 'ControlRight':
                this.ctrlkey = true;
                break;
            case 'Escape':
                this.#end_edit();
                break;
            }
        });
        document.body.addEventListener('keyup', e => {
            switch (e.code) {
            case 'ShiftLeft': case 'ShiftRight':
                this.shiftkey = false;
                break;
            case 'ControlLeft': case 'ControlRight':
                this.ctrlkey = false;
                break;
            }
        });
        this.#add_item(new TtsItem(this.voices[0])).select();
        this.stop_mark.style.display = 'none';
        this.#enable_parameters(false);
        this.#enable_player_buttons();
        this.set_filename('');
        this.is_playing = false;
    }

    set_filename(name) {
        this.filename = name;
        this.filename_area.textContent = name === '' ? '' : ': ' + name;
    }

    get_selected_items() {
        const ret = [];
        for (const item of this.items) {
            if (item.is_selected()) {
                ret.push(item);
            }
        }
        return ret;
    }
    get_selected_contain_items() {
        const ret = [];
        for (const item of this.items) {
            if (item.is_selected() && item.pfn.length > 0) {
                ret.push(item);
            }
        }
        return ret;
    }
    show() {
        if (this.refresh_icon) {
            for (const item of this.items) {
                if (this.voices.indexOf(item.voice) < 0) {
                    // not exist
                    item.voice = this.voices[0];
                }
                item.set_image(item.voice.icon);
            }
            this.refresh_icon = false;
        }
        this.sub_undo.disabled = true;
        this.sub_redo.disabled = true;
    }
    hide() {
        this.#end_edit();
    }
    on_undo() {
    }
    #add_item(item) {
        item.elem.dataset.i = this.items.length;
        this.items.push(item);
        this.list.insertBefore(item.elem, this.item_append);
        item.elem.addEventListener('click', e => {
            this.#onclick_item(Number.parseInt(e.currentTarget.dataset.i));
        });
        item.elem.addEventListener('dragstart', e => {
            e.dataTransfer.items.clear();
            e.dataTransfer.items.add(e.currentTarget.dataset.i, 'text/plain');
        });
        item.elem.addEventListener('dragenter', e => {
            e.preventDefault();
        });
        item.elem.addEventListener('dragover', e => {
            e.preventDefault();
        });
        item.elem.addEventListener('drop', e => {
            const data = e.dataTransfer.getData('text/plain');
            if (data) {
                const src = Number.parseInt(data);
                const dst = Number.parseInt(e.currentTarget.dataset.i);
                this.#swap_item(src, dst);
            }
        });
        item.voice_select.addEventListener('click', e => {
            const parent = e.currentTarget.parentNode;
            if (parent.classList.contains('tts-selected')) {
                const idx = Number.parseInt(parent.dataset.i);
                const item = this.items[idx];
                this.#create_voice_select(item);
                this.voice_select.showPopover({source: item.voice_anchor});
            }
        });
        item.close_button.addEventListener('click', e => {
            e.stopPropagation();
            this.#end_edit();

            const idx = Number.parseInt(e.currentTarget.parentNode.dataset.i);
            this.items[idx].elem.remove();
            this.items.splice(idx, 1);
            this.last_select = null;
            this.#set_note();
            this.#renumber();
            e.stopPropagation();
        });
        return item;
    }
    #swap_item(src, dst) {
        if (src < dst) {
            const s1 = this.items.splice(src, 1);
            this.items.splice(dst, 0, s1[0]);
            this.list.insertBefore(this.list.childNodes[src], this.list.childNodes[dst].nextSibling);
            this.#renumber();
        } else if (src > dst) {
            const s1 = this.items.splice(src, 1);
            this.items.splice(dst, 0, s1[0]);
            this.list.insertBefore(this.list.childNodes[src], this.list.childNodes[dst]);
            this.#renumber();
        }
    }
    #onclick_item(idx) {
        const item = this.items[idx];
        if (this.shiftkey && this.last_select) {
            // range select
            let idx2 = this.last_select.get_index();
            if (idx > idx2) {
                const tmp = idx;
                idx = idx2;
                idx2 = tmp;
            }
            for (let i = 0; i < this.items.length; i++) {
                if (i >= idx && i <= idx2) {
                    this.items[i].select();
                } else {
                    this.items[i].unselect();
                }
            }
            this.#end_edit();
            this.#set_note();
        } else if (this.ctrlkey) {
            if (item.is_selected()) {
                item.unselect();
            } else {
                item.select();
            }
            this.#end_edit();
            this.#set_note();
            this.last_select = item;
        } else if (item !== this.editing_item) {
            const sel_items = this.get_selected_items();
            if (sel_items.length === 1 && item === sel_items[0]) {
                this.#begin_edit(item);
            } else {
                for (const it of this.items) {
                    if (it === item) {
                        it.select();
                    } else {
                        it.unselect();
                    }
                }
                this.#end_edit();
                this.#set_note();
            }
            this.last_select = item;
        }
        this.#enable_player_buttons();
    }
    #enable_player_buttons() {
        let count = 0;
        for (const item of this.items) {
            if (item.pfn.length > 0 && item.is_selected()) count++;
        }
        if (count > 0) {
            this.play_button.classList.add('enabled');
            this.wavefile_button.classList.add('enabled');
        } else {
            this.play_button.classList.remove('enabled');
            this.wavefile_button.classList.remove('enabled');
        }
        if (count > 1) {
            this.wavefiles_button.classList.add('enabled');
        } else {
            this.wavefiles_button.classList.remove('enabled');
        }
    }
    #enable_parameters(b) {
        this.tts_speed.enable(b);
        this.tts_pitch.enable(b);
        this.tts_accent.enable(b);
        this.tts_volume.enable(b);
    }
    #save_parameters(item) {
        if (item) {
            item.speed = this.tts_speed.get();
            item.pitch = this.tts_pitch.get();
            item.accent = this.tts_accent.get();
            item.volume = this.tts_volume.get();
        }
    }
    #begin_edit(item) {
        this.#end_edit(item);
        if (item) {
            this.last_selected = item;
            this.editing_item = item;
            this.edit_text.value = item.text;
            this.edit_phonetic.value = item.phonetic;
            this.tts_speed.set(item.speed);
            this.tts_pitch.set(item.pitch);
            this.tts_accent.set(item.accent);
            this.tts_volume.set(item.volume);
            this.#enable_parameters(true);
            item.begin_edit(this.edit_root);
            this.edit_text.focus();
            this.edit_text.select();
            item.elem.removeAttribute('draggable');
            this.#set_note();
        }
    }
    #end_edit() {
        if (this.editing_item) {
            const prev = this.editing_item;
            this.#save_parameters(prev);
            this.#enable_parameters(false);
            prev.end_edit(this.edit_root);
            prev.elem.setAttribute('draggable', 'true');
            this.editing_item = null;

            if (this.selected_pfn !== -1) {
                this.selected_pfn = -1;
                this.pfn_edit.disabled = true;
                this.pfn_edit.value = '';
                for (const c2 of document.getElementById('tts-note-svg').getElementsByClassName('note-chunk-selected')) {
                    c2.classList.remove('note-chunk-selected');
                }
            }
        }
    }
    #set_pfn() {
        const item = this.editing_item;
        if (!item) return;
        item.text = this.edit_text.value;
        item.phonetic = this.edit_phonetic.value;
        try {
            const c = new JaToPFN({
                voiceless: true,
                reduce_pitch: true,
            });
            this.editing_item.pfn = c.conv(this.edit_phonetic.value);
        } catch (e) {
            console.log(e);
        }
    }
    #set_note() {
        if (this.editing_item) {
            this.#set_note_main([this.editing_item], false);
        } else {
            this.#set_note_main(this.get_selected_items(), false);
        }
    }
    #set_note_main(items, keep) {
        const synth = new VoiceSynth(VoiceSynth.default_voice());
        for (const item of items) {
            synth.set_pfn(item.pfn, item.speed, 4800, 400, 1.0);
        }
        const note = new SpeechNote(synth);
        const chunk = note.draw(document.getElementById('tts-note-svg'));
        if (keep) {
            for (const ch of chunk) {
                if (this.selected_pfn === Number.parseInt(ch.dataset.i)) {
                    ch.classList.add('note-chunk-selected');
                }
            }
        } else {
            this.selected_pfn = -1;
            this.pfn_edit.disabled = true;
            this.pfn_edit.value = '';
        }

        for (const ch of chunk) {
            ch.addEventListener('click', e => {
                if (!this.editing_item) return;

                const t = e.currentTarget;
                this.selected_pfn = -1;
                for (const c2 of chunk) {
                    if (c2 === t && !c2.classList.contains('note-chunk-selected')) {
                        c2.classList.add('note-chunk-selected');
                        this.selected_pfn = Number.parseInt(t.dataset.i);
                    } else {
                        c2.classList.remove('note-chunk-selected');
                    }
                }
                if (this.selected_pfn !== -1) {
                    this.pfn_edit.disabled = false;
                    this.pfn_edit.value = this.editing_item.pfn[this.selected_pfn];
                } else {
                    this.pfn_edit.disabled = true;
                    this.pfn_edit.value = '';
                }
            });
        }
    }
    #enter_line_done() {
        const item = this.editing_item;
        const idx = this.items.indexOf(item);
        if (idx === this.items.length - 1) {
            this.#add_item(new TtsItem(this.voices[0]));
        }
        if (idx < this.items.length - 1) {
            item.unselect();
            this.items[idx + 1].select();
            this.#begin_edit(this.items[idx + 1]);
        }
    }
    #renumber() {
        let i = 0;
        for (const item of this.items) {
            item.elem.dataset.i = i;
            i++;
        }
    }
    #create_voice_select(item) {
        this.voice_select.replaceChildren();
        for (let i = 0; i < this.voices.length; i++) {
            const voice = this.voices[i];
            const v_item = $e('div', {'class':'tss-voice-select-item', 'data-i':i});
            v_item.appendChild($e('img', {src:voice.icon, alt:'', width:32, height:32}));
            v_item.appendChild($e('div', {class:'tss-voice-select-name'}, voice.name));
            if (item.voice === voice) {
                v_item.classList.add('tts-voice-selected');
            }
            this.voice_select.appendChild(v_item);
            v_item.addEventListener('click', e => {
                const idx = Number.parseInt(e.currentTarget.dataset.i);
                item.voice = this.voices[idx];
                item.set_image(item.voice.icon);
                this.voice_select.hidePopover();
            });
        }
    }
    #play() {
        this.#save_parameters(this.editing_item);
        const sel_items = this.get_selected_contain_items();
        if (sel_items.length === 0) return;

        this.play_mark.style.display = 'none';
        this.stop_mark.style.display = '';
        this.is_playing = true;

        this.player.play_seq(() => {
            const item = sel_items.shift();
            if (!item) return null;
            const synth = new VoiceSynth(item.voice);
            synth.set_pfn(item.pfn, item.speed, item.pitch + 4800, item.accent, item.volume / 100);
            const buf = new Float32Array(synth.get_remaining());
            synth.generate(buf);
            return buf;
        }).then(() => {
            this.play_mark.style.display = '';
            this.stop_mark.style.display = 'none';
            this.is_playing = false;
        });
    }
    static #create_filename(format, n, item) {
        const a = [];
        for (const f of format) {
            switch (f) {
            case '{n}': a.push(n); break;
            case '{voice}': a.push(item.voice.name); break;
            case '{text}': a.push(item.get_text()); break;
            default: a.push(f); break;
            }
        }
        return a.join('').substring(0, 32) + '.wav';
    }
    #wavfile_download() {
        this.#save_parameters(this.editing_item);
        const sel_items = this.get_selected_contain_items();
        if (sel_items.length === 0) return;

        const list = [];
        let filename = '';
        for (const item of sel_items) {
            const synth = new VoiceSynth(item.voice);
            synth.set_pfn(item.pfn, item.speed, item.pitch + 4800, item.accent, item.volume / 100);
            const buf = new Float32Array(synth.get_remaining());
            synth.generate(buf);
            list.push(buf);

            if (filename === '') {
                filename = TtsPage.#create_filename(this.db.get_filename_single(), 0, item);
            }
        }

        const wav = new WavFile(SAMPLING_RATE, 1, 1);
        this.dialog.show_download(new Blob([wav.create(list)]), filename);
    }
    #wavfile_download_list() {
        this.#save_parameters(this.editing_item);
        const sel_items = this.get_selected_contain_items();
        if (sel_items.length === 0) return;

        const list = [];
        for (let i = 0; i < sel_items.length; i++) {
            const item = sel_items[i];
            const synth = new VoiceSynth(item.voice);
            synth.set_pfn(item.pfn, item.speed, item.pitch + 4800, item.accent, item.volume / 100);
            const buf = new Float32Array(synth.get_remaining());
            synth.generate(buf);

            const filename = TtsPage.#create_filename(this.db.get_filename_seq(), i + 1, item);
            const wav = new WavFile(SAMPLING_RATE, 1, 1)
            list.push([new Blob([wav.create([buf])]), filename]);
        }
        this.dialog.show_download_list(list);
    }
    #find_voice_by_name(name) {
        for (const v of this.voices) {
            if (v.name === name) return v;
        }
        return this.voices[0];
    }
    #load_json_object(obj) {
        for (const it of this.items) {
            it.elem.remove();
        }
        this.items = [];
        if (obj) {
            for (const it of obj.items) {
                this.#add_item(TtsItem.from_json_object(it, this.#find_voice_by_name(it.voice)));
            }
        } else {
            this.#add_item(new TtsItem(this.voices[0]));
        }
        if (this.items.length > 0) {
            this.items[0].select();
        }
        this.#set_note();
        this.#enable_player_buttons();
    }
    #save_json_object() {
        const obj = {
            items: [],
        };
        for (const it of this.items) {
            obj.items.push(it.to_json_object());
        }
        return obj;
    }
}
