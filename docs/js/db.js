import { JaReading } from '../lib/text_ja.js';

export class SettingDB
{
    static async open() {
        const request = window.indexedDB.open('NinbosVoice', 1);
        return new Promise((resolve, reject) => {
            request.addEventListener('error', e => {
                reject(e);
            });
            request.addEventListener('success', e => {
                const db = new SettingDB(e.target.result);
                db.init().then(() => resolve(db));
            });
            request.addEventListener('upgradeneeded', e => {
                this.db = e.target.result;
                this.db.createObjectStore('config', { keyPath: 'key' });
                this.db.createObjectStore('voices', { keyPath: 'order' });
                this.db.createObjectStore('projects', { keyPath: 'name' });
                this.db.createObjectStore('ja_alias', { keyPath: 's' });
                this.db.createObjectStore('ja_dic', { keyPath: 'w' });
            });
        });
    }
    static #to_promise(request) {
        return new Promise((resolve, reject) => {
            request.addEventListener('error', e => {
                reject(e);
            });
            request.addEventListener('success', () => {
                resolve(request.result);
            });
        });
    }
    static split_format(s) {
        let prev = 0;
        const ret = [];
        for (const m of s.matchAll(/\{\w+\}/g)) {
            if (prev < m.index) ret.push(s.substring(prev, m.index));
            ret.push(m[0]);
            prev = m.index + m[0].length;
        }
        if (prev < s.length) ret.push(s.substring(prev));
        return ret;
    }

    constructor(db) {
        this.db = db;
        this.filename_single = '{voice} - {text}';
        this.filename_seq = '{n}.{voice} - {text}';
    }
    async init() {
        const store = this.#open_read('config');
        const list = await SettingDB.#to_promise(store.getAll());
        for (const row of list) {
            if (row.key === 'filename_single') {
                this.filename_single = row.value;
            } else if (row.key === 'filename_seq') {
                this.filename_seq = row.value;
            }
        }
        this.voices = await this.get_voices();
    }
    delete_database() {
        window.indexedDB.deleteDatabase('NinbosVoice');
    }

    get_filename_single() {
        return SettingDB.split_format(this.filename_single);
    }
    get_filename_seq() {
        return SettingDB.split_format(this.filename_seq);
    }
    #open_read(name) {
        const tr = this.db.transaction(name, 'readonly');
        if (name instanceof Array) {
            return name.map(n => tr.objectStore(n));
        } else {
            return tr.objectStore(name);
        }
    }
    #open_rw(name) {
        const tr = this.db.transaction(name, 'readwrite');
        if (name instanceof Array) {
            return name.map(n => tr.objectStore(n));
        } else {
            return tr.objectStore(name);
        }
    }
    config_save() {
        const store = this.#open_rw('config');
        store.put({key: 'filename_single', value: this.filename_single});
        store.put({key: 'filename_seq', value: this.filename_seq});
    }
    async get_voices() {
        const store = this.#open_read('voices');
        const list = await SettingDB.#to_promise(store.getAll());
        list.sort((a, b) => a.order - b.order);
        const ret = [];
        for (const row of list) {
            if (SettingDB.#is_valid_voice(row.value)) {
                ret.push(row.value);
            }
        }
        return ret;
    }
    static #is_valid_voice(voice) {
        return typeof(voice.icon) === 'string' &&
            typeof(voice.name) === 'string' &&
            Number.isFinite(voice.pitch) &&
            Number.isFinite(voice.flutter) &&
            Number.isFinite(voice.roughness) &&
            Number.isFinite(voice.fricative) &&
            voice.height instanceof Int16Array &&
            voice.height.length === 7 &&
            voice.width instanceof Int16Array &&
            voice.width.length === 7 &&
            voice.freq instanceof Int16Array &&
            voice.freq.length === 7 &&
            voice.freqadd instanceof Int16Array &&
            voice.freqadd.length === 7;
    }
    static #trim_voice_data(v0) {
        const v = {};
        for (const k in v0) {
            if (v0[k] instanceof Int16Array || typeof(v0[k]) !== 'object') {
                v[k] = v0[k];
            }
        }
        return v;
    }
    save_voice(voice, index) {
        const store = this.#open_rw('voices');
        store.put({order: index, value: SettingDB.#trim_voice_data(voice)});
    }
    async save_all_voices(voices) {
        const store = this.#open_rw('voices');
        const count = await SettingDB.#to_promise(store.count());

        for (let i = 0; i < voices.length; i++) {
            store.put({order: i, value: SettingDB.#trim_voice_data(voices[i])});
        }
        for (let i = voices.length; i < count; i++) {
            store.delete(i);
        }
    }

    async get_all_projects() {
        const store = this.#open_read('projects');
        const list = await SettingDB.#to_promise(store.getAll());
        list.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
        return list;
    }
    save_project(name, value) {
        const store = this.#open_rw('projects');
        store.put({name, value});
    }
    delete_project(name) {
        const store = this.#open_rw('projects');
        store.delete(name);
    }

    async get_ja_dic() {
        const [alias_store, dic_store] = this.#open_read(['ja_alias', 'ja_dic']);
        return await Promise.all([
            SettingDB.#to_promise(alias_store.getAll()),
            SettingDB.#to_promise(dic_store.getAll())
        ]);
    }

    async get_ja_dic_as_file() {
        const [alias_src, dic_src] = await this.get_ja_dic();
        const alias = alias_src.map(row => row.s + "|" + row.d + "\n").sort();
        const dic = dic_src.map(row => [row.w, row.k, ...row.v].join("|") + "\n").sort();

        const ret = [];
        for (const line of alias) {
            ret.push(line);
        }
        ret.push("=\n");
        for (const line of dic) {
            ret.push(line);
        }
        return new Blob(ret);
    }

    async set_ja_dic_file(src) {
        const [alias_store, dic_store] = this.#open_rw(['ja_alias', 'ja_dic']);

        await Promise.all([
            SettingDB.#to_promise(alias_store.clear()),
            SettingDB.#to_promise(dic_store.clear())
        ]);

        const [alias, dic] = JaReading.parse(src);
        for (const obj of alias) {
            alias_store.put(obj);
        }
        for (const obj of dic) {
            dic_store.put(obj);
        }
        return [alias, dic];
    }
}
