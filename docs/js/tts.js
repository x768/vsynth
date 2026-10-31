import { SAMPLING_RATE, VoiceSynth } from '../lib/vsynth.js';
import { WavFile } from '../lib/misc.js';
import { SpeechNote } from './note.js';
import { create_icon } from './voice.js';
import { speech_langs } from './lang.js';
import { $e } from './utils.js';

class TtsItem
{
    constructor(voice, lang, obj) {
        this.voice = voice;
        if (obj) {
            this.lang = obj.lang;
            this.text = obj.text;
            this.phonemic = obj.phonemic;
            this.speed = obj.speed;
            this.pitch = obj.pitch;
            this.accent = obj.accent;
            this.volume = obj.volume;
            this.pfn = obj.pfn;
        } else {
            this.lang = lang.tag;
            this.text = '';
            this.phonemic = '';
            this.speed = lang.params.speed;
            this.accent = lang.params.accent;
            this.pitch = 0;
            this.volume = 0; // dB
            this.pfn = [];
        }
        this.text_area = $e('div', null, this.get_text());
        this.voice_anchor = $e('div');
        this.elem = $e('div', {'class': 'tts-item', draggable:'true'},
            $e('div', {'class': 'tts-voice-select'}, this.voice_anchor, $e('img', {width:32, height:32})),
            this.text_area,
            $e('div', {'class': 'tts-item-del'}, create_icon('x'))
        );
        this.update_icon();
    }
    async load_speech_lang(db) {
        const lang = speech_langs[this.lang];
        if (!lang.is_loaded()) {
            await lang.load();
            if (lang.use_dic) {
                lang.to_phonemic.load(await db.get_dic(this.lang));
            }
        }
    }
    update_icon() {
        this.elem.getElementsByTagName('img')[0].setAttribute('src', this.voice.icon);
    }
    begin_edit(edit_root) {
        this.text_area.textContent = '';
        this.text_area.appendChild(edit_root);
    }
    end_edit(edit_root) {
        edit_root.remove();
        this.text_area.textContent = this.get_text();
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
        return this.text !== '' ? this.text : this.phonemic;
    }
    get_lang() {
        return speech_langs[this.lang];
    }
    get_volume_linear() {
        if (this.volume > 0) return 1;
        return Math.pow(10, this.volume * 0.1);
    }
    to_json_object() {
        return {
            voice: this.voice.name,
            lang: this.lang,
            text: this.text,
            phonemic: this.phonemic,
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
    constructor(db, voices, dialog, speech_lang, player) {
        this.db = db;
        this.voices = voices;
        this.dialog = dialog;
        this.player = player;
        this.speech_lang = speech_lang;
 
        this.list = document.getElementById('tts-list');
        this.sub_save = document.getElementById('sub-save-proj');
        const sub_open = document.getElementById('sub-open-proj');
        const sub_save_as = document.getElementById('sub-save-as');
        const sub_manage = document.getElementById('sub-manage-proj');
        this.sub_undo = document.getElementById('sub-undo');
        this.sub_redo = document.getElementById('sub-redo');
        this.filename_area = document.getElementById('filename');
        const template = document.getElementById('tts-editor-template').content;
        this.edit_root = template.getElementById('tts-editor');
        this.edit_text = template.getElementById('tts-text-src');
        this.edit_phonemic = template.getElementById('tts-text-phonemic');
        this.tts_speed = new NumberControl('tts-speed');
        this.tts_pitch = new NumberControl('tts-pitch');
        this.tts_accent = new NumberControl('tts-accent');
        this.tts_volume = new NumberControl('tts-volume');
        this.play_mark = document.getElementById('tts-play-mark');
        this.stop_mark = document.getElementById('tts-stop-mark');
        this.pfn_edit = document.getElementById('tts-pfn-edit');
        this.pfn_update_button = document.getElementById('tts-pfn-update');
        this.item_append = document.getElementById('tts-item-add');
        this.parameter = document.getElementById('tts-parameter');
        this.voice_select = document.getElementById('tts-voice-select');
        this.play_button = document.getElementById('tts-play-stop');
        this.wavefile_button = document.getElementById('tts-wav-download');
        this.wavefiles_button = document.getElementById('tts-wavs-download');

        this.items = [];
        this.editing_item = null;
        this.selecting_item = null;
        this.selected_pfn = -1;
        this.undo_list = [];
        this.undo_cursor = 0;
        this.saved_pos = 0;
        this.pfn_edit.value = '';
        this.pfn_edit.disabled = true;
        this.pfn_update_button.disabled = true;
        this.refresh_icon = false;
        this.last_select = null;
        this.last_click_item = null;
        this.filename = '';
        this.shiftkey = false;
        this.ctrlkey = false;
        this.text_changed = false;
        this.is_page_showing = false;

        this.sub_undo.addEventListener('click', () => {
            this.undo();
        });
        this.sub_redo.addEventListener('click', () => {
            this.redo();
        });

        this.item_append.addEventListener('click', async () => {
            for (const it of this.items) {
                it.unselect();
            }
            const new_item = new TtsItem(this.voices[0], this.speech_lang, null);
            this.#add_item(new_item);
            this.push_undo({type:'del', i:this.items.length - 1});
            new_item.select();
            this.#begin_edit(new_item);
        });

        this.edit_text.addEventListener('change', () => {
            if (!this.text_changed) {
                const item = this.editing_item;
                this.push_undo({type:'text', i:item.get_index(), v:item.to_json_object()});
                this.text_changed = true;
            }
            this.edit_text.value = this.edit_text.value.normalize('NFKC');
            const converter = this.editing_item.get_lang().to_phonemic;
            this.edit_phonemic.value = converter.conv(this.edit_text.value);
            this.#set_pfn();
            this.#set_note();
            this.#enable_player_buttons();
        });
        this.edit_text.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                this.edit_phonemic.focus();
                this.#enable_player_buttons();
            } else if (e.key === 'Escape') {
                this.#end_edit();
            }
        });
        this.edit_phonemic.addEventListener('change', () => {
            if (!this.text_changed) {
                const item = this.editing_item;
                this.push_undo({type:'text', i:item.get_index(), v:item.to_json_object()});
                this.text_changed = true;
            }
            this.#set_pfn();
            this.#set_note();
            this.#enable_player_buttons();
        });
        this.edit_phonemic.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                this.#enter_line_done();
                this.#enable_player_buttons();
            } else if (e.key === 'Escape') {
                this.#end_edit();
            }
        });
        this.pfn_update_button.addEventListener('click', () => {
            const item = this.selecting_item;
            if (item !== null && this.selected_pfn !== -1) {
                this.push_undo({type:'pfn', i:item.get_index(), v:item.pfn.slice()});
                this.text_changed = false;
                item.pfn[this.selected_pfn] = this.pfn_edit.value;
                this.#set_note_main([item], true);
            }
        });
        document.getElementById('tts-parameter').addEventListener('change', () => {
            const item = this.selecting_item;
            if (item !== null) {
                this.push_undo({type:'parameter', i:item.get_index(), v:item.to_json_object()});
                item.speed = this.tts_speed.get();
                item.pitch = this.tts_pitch.get();
                item.accent = this.tts_accent.get();
                item.volume = this.tts_volume.get();
            }
        });
        this.list.addEventListener('click', e => {
            let elem;
            if (e.currentTarget === e.target) {
                this.#end_edit();
            } else if ((elem = e.target.closest('.tts-voice-select')) !== null) {
                const idx = Number.parseInt(elem.parentNode.dataset.i);
                const item = this.items[idx];
                this.#create_voice_select(item);
                this.last_click_item = item;
                this.voice_select.showPopover({source: item.voice_anchor});
            } else if ((elem = e.target.closest('.tts-item-del')) !== null) {
                this.#end_edit();

                const idx = Number.parseInt(elem.parentNode.dataset.i);
                this.push_undo({type:'add', i:idx, v:this.items[idx].to_json_object()});
                this.#del_item(idx);
            } else if ((elem = e.target.closest('.tts-item')) !== null) {
                this.#onclick_item(Number.parseInt(elem.dataset.i));
            }
        });
        this.voice_select.addEventListener('click', e => {
            const elem = e.target.closest('.tss-voice-select-item');
            if (elem !== null) {
                const idx = Number.parseInt(elem.dataset.i);
                this.push_undo({type:'voice', i:this.last_click_item.get_index(), v:this.last_click_item.voice.name});
                this.text_changed = false;
                this.last_click_item.voice = this.voices[idx];
                this.last_click_item.update_icon();
                this.voice_select.hidePopover();
                this.last_click_item = null;
            }
        });
        this.list.addEventListener('dragstart', e => {
            const elem = e.target.closest('.tts-item');
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
            const elem = e.target.closest('.tts-item');
            if (elem !== null) {
                const data = e.dataTransfer.getData('text/plain');
                if (data !== null) {
                    const src = Number.parseInt(data);
                    const dst = Number.parseInt(elem.dataset.i);
                    this.#swap_item(src, dst);
                    this.push_undo({type:'swap', src:dst, dst:src});
                }
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
            const f = await this.dialog.select_project(list, false);
            if (f !== null) {
                let found = null;
                for (const pj of list) {
                    if (pj.name === f) {
                        found = pj.value;
                        break;
                    }
                }
                this.set_filename(f);
                this.#load_json_object(found);
                this.clear_undo();
            }
        });
        this.sub_save.addEventListener('click', () => {
            if (this.filename !== '') {
                this.db.save_project(this.filename, this.#save_json_object());
                this.saved_pos = this.undo_cursor;
                this.#update_undo_button();
            } else {
                sub_save_as.click();
            }
        });
        sub_save_as.addEventListener('click', async () => {
            const list = await this.db.get_all_projects();
            const f = await this.dialog.select_project(list, true);
            if (f !== null) {
                this.set_filename(f);
                this.db.save_project(f, this.#save_json_object());
                this.saved_pos = this.undo_cursor;
                this.#update_undo_button();
            }
        });
        sub_manage.addEventListener('click', async () => {
            const list = await this.db.get_all_projects();
            this.dialog.manage_project(list, this.db);
        });
        document.body.addEventListener('keydown', e => {
            if (!this.is_page_showing) return;

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
            case 'KeyZ':
                if (this.ctrlkey && this.editing_item === null) this.undo();
                break;
            case 'KeyY':
                if (this.ctrlkey && this.editing_item === null) this.redo();
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
        this.stop_mark.style.display = 'none';
        this.#enable_player_buttons();
        this.#update_undo_button();
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
        this.is_page_showing = true;
        if (this.refresh_icon) {
            for (const item of this.items) {
                if (this.voices.indexOf(item.voice) < 0) {
                    // not exist
                    item.voice = this.voices[0];
                }
                item.update_icon();
            }
            this.refresh_icon = false;
        }
    }
    hide() {
        this.is_page_showing = false;
        this.#end_edit();
    }
    undo() {
        if (this.undo_cursor > 0) {
            this.undo_cursor--;
            this.exec_undo();
            this.#update_undo_button();
        }
    }
    redo() {
        if (this.undo_cursor < this.undo_list.length) {
            this.exec_undo();
            this.undo_cursor++;
            this.#update_undo_button();
        }
    }

    push_undo(p) {
        if (this.undo_cursor > 0 && this.undo_cursor !== this.saved_pos) {
            const prev = this.undo_list[this.undo_cursor - 1];
            if (prev.type === 'parameter' && p.type === 'parameter') return;
        }
        if (this.undo_cursor < this.undo_list.length) {
            this.undo_list.splice(this.undo_cursor);
        }
        this.undo_list.push(p);
        this.undo_cursor = this.undo_list.length;
        this.#update_undo_button();
    }
    exec_undo() {
        const p = this.undo_list[this.undo_cursor];
        let p2 = null;
        switch (p.type) {
        case 'add':
            p2 = {type:'del', i:p.i};
            this.#add_item_at(new TtsItem(this.#find_voice_by_name(p.v.voice), this.speech_lang, p.v), p.i);
            break;
        case 'swap':
            p2 = {type:'swap', src:p.dst, dst:p.src};
            this.#swap_item(p.src, p.dst);
            break;
        case 'del':
            p2 = {type:'add', i:p.i, v:this.items[p.i].to_json_object()};
            this.#del_item(p.i);
            break;
        case 'parameter':
        case 'character':
        case 'text':
            p2 = {type:p.type, i:p.i, v:this.items[p.i].to_json_object()};
            this.#set_item_at(new TtsItem(this.#find_voice_by_name(p.v.voice), this.speech_lang, p.v), p.i);
            break;
        case 'pfn':
            p2 = {type:'pfn', i:p.i, v:this.items[p.i].pfn.slice()};
            this.items[p.i].pfn = p.v;
            this.#set_note();
            break;
        case 'voice':
            p2 = {type:'voice', i:p.i, v:this.items[p.i].voice.name};
            this.items[p.i].voice = this.#find_voice_by_name(p.v);
            this.items[p.i].update_icon();
            break;
        }
        if (p2 !== null) this.undo_list[this.undo_cursor] = p2;
    }
    clear_undo() {
        this.undo_list = [];
        this.undo_cursor = 0;
        this.saved_pos = 0;
        this.#update_undo_button();
    }
    #update_undo_button() {
        this.sub_undo.disabled = this.undo_cursor === 0;
        this.sub_redo.disabled = this.undo_cursor >= this.undo_list.length;
        this.sub_save.disabled = this.saved_pos === this.undo_cursor;
    }

    #add_item(item) {
        item.elem.dataset.i = this.items.length;
        this.items.push(item);
        this.list.insertBefore(item.elem, this.item_append);
    }
    #add_item_at(item, idx) {
        this.items.splice(idx, 0, item);
        this.list.insertBefore(item.elem, this.list.childNodes[idx]);
        this.#renumber();
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
    #set_item_at(item, idx) {
        if (this.items[idx].is_selected()) {
            item.select();
        }
        item.elem.dataset.i = idx;
        this.items[idx] = item;
        const n = this.list.childNodes[idx];
        this.list.insertBefore(item.elem, n);
        n.remove();
        this.#set_note();
        this.#enable_player_buttons();
    }
    #del_item(idx) {
        this.items[idx].elem.remove();
        this.items.splice(idx, 1);
        this.last_select = null;
        this.#set_note();
        this.#renumber();
        this.#enable_player_buttons();
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
            if (item === this.selecting_item) {
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
        this.selecting_item = null;
        for (const item of this.items) {
            if (item.is_selected()) {
                if (item.pfn.length > 0) count++;
                this.selecting_item = item;
            }
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
            this.selecting_item = null;
        } else {
            this.wavefiles_button.classList.remove('enabled');
        }
        this.#set_parameters(this.selecting_item);
    }
    #set_parameters(item) {
        const b = item !== null;
        this.tts_speed.enable(b);
        this.tts_pitch.enable(b);
        this.tts_accent.enable(b);
        this.tts_volume.enable(b);
        if (item !== null) {
            this.tts_speed.set(item.speed);
            this.tts_pitch.set(item.pitch);
            this.tts_accent.set(item.accent);
            this.tts_volume.set(item.volume);
        }
    }
    #begin_edit(item) {
        this.#end_edit();
        if (item === null) return;

        this.last_selected = item;
        this.editing_item = item;
        this.edit_text.value = item.text;
        this.edit_phonemic.value = item.phonemic;
        item.begin_edit(this.edit_root);
        this.edit_text.focus();
        this.edit_text.select();
        item.elem.removeAttribute('draggable');
        this.#set_note();
    }
    #end_edit() {
        this.text_changed = false;
        const item = this.editing_item;
        if (item === null) return;
        item.end_edit(this.edit_root);
        item.elem.setAttribute('draggable', 'true');
        this.editing_item = null;
    }
    #set_pfn() {
        const item = this.editing_item;
        if (item === null) return;
        item.text = this.edit_text.value;
        item.phonemic = this.edit_phonemic.value;
        try {
            const lang = speech_langs[item.lang];
            const c = new lang.ToSound({
                voiceless: true,
                reduce_pitch: true,
            });
            item.pfn = c.conv(this.edit_phonemic.value);
        } catch (e) {
            console.log(e);
        }
    }
    #set_note() {
        this.#set_note_main(this.get_selected_items(), false);
    }
    #set_note_main(items, keep) {
        const synth = new VoiceSynth(VoiceSynth.default_voice());
        for (const item of items) {
            synth.set_pfn(item.pfn, item.speed, 4800, 400, 1.0);
        }
        const note = new SpeechNote(synth, SAMPLING_RATE);
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
            this.pfn_update_button.disabled = true;
        }

        for (const ch of chunk) {
            ch.addEventListener('click', e => {
                if (this.selecting_item === null) return;

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
                    this.pfn_edit.value = this.selecting_item.pfn[this.selected_pfn];
                    this.pfn_update_button.disabled = false;
                } else {
                    this.pfn_edit.disabled = true;
                    this.pfn_edit.value = '';
                    this.pfn_update_button.disabled = true;
                }
            });
        }
    }
    #enter_line_done() {
        const item = this.editing_item;
        const idx = this.items.indexOf(item);
        if (idx === this.items.length - 1) {
            this.#add_item(new TtsItem(this.voices[0], this.speech_lang, null));
            this.push_undo({type:'del', i:this.items.length - 1});
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
        }
    }
    #play() {
        const sel_items = this.get_selected_contain_items();
        if (sel_items.length === 0) return;

        this.play_mark.style.display = 'none';
        this.stop_mark.style.display = '';
        this.is_playing = true;

        this.player.play_seq(() => {
            const item = sel_items.shift();
            if (!item) return null;
            const synth = new VoiceSynth(item.voice);
            synth.set_pfn(item.pfn, item.speed, item.pitch + 4800, item.accent, item.get_volume_linear());
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
        const sel_items = this.get_selected_contain_items();
        if (sel_items.length === 0) return;

        const list = [];
        let filename = '';
        for (const item of sel_items) {
            const synth = new VoiceSynth(item.voice);
            synth.set_pfn(item.pfn, item.speed, item.pitch + 4800, item.accent, item.get_volume_linear());
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
        const sel_items = this.get_selected_contain_items();
        if (sel_items.length === 0) return;

        const list = [];
        for (let i = 0; i < sel_items.length; i++) {
            const item = sel_items[i];
            const synth = new VoiceSynth(item.voice);
            synth.set_pfn(item.pfn, item.speed, item.pitch + 4800, item.accent, item.get_volume_linear());
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
                this.#add_item(new TtsItem(this.#find_voice_by_name(it.voice), this.speech_lang, it));
            }
        } else {
            this.#add_item(new TtsItem(this.voices[0], this.speech_lang, null));
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
