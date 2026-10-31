export class DataHolder
{
    static async open() {
        const request = window.indexedDB.open('NinbosVoice', 1);
        return new Promise((resolve, reject) => {
            request.addEventListener('error', e => {
                reject(e);
            });
            request.addEventListener('success', e => {
                const db = new DataHolder(e.target.result);
                db.init().then(() => resolve(db));
            });
            request.addEventListener('upgradeneeded', e => {
                this.db = e.target.result;
                this.db.createObjectStore('config', { keyPath: 'key' });
                this.db.createObjectStore('voices', { keyPath: 'order' });
                this.db.createObjectStore('projects', { keyPath: 'name' });

                this.db.createObjectStore('ja_alias', { keyPath: 's' });
                this.db.createObjectStore('ja_words', { keyPath: 'w' });
                this.db.createObjectStore('en_alias', { keyPath: 's' });
                this.db.createObjectStore('en_words', { keyPath: 'w' });
            });
        });
    }
    static to_promise(request) {
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
        this.lang = '';
    }
    async init() {
        const store = this.open_read('config');
        const list = await DataHolder.to_promise(store.getAll());
        for (const row of list) {
            this[row.key] = row.value;
        }
    }
    delete_database() {
        window.indexedDB.deleteDatabase('NinbosVoice');
    }

    get_filename_single() {
        return DataHolder.split_format(this.filename_single);
    }
    get_filename_seq() {
        return DataHolder.split_format(this.filename_seq);
    }
    open_read(name) {
        const tr = this.db.transaction(name, 'readonly');
        if (name instanceof Array) {
            return name.map(n => tr.objectStore(n));
        } else {
            return tr.objectStore(name);
        }
    }
    open_rw(name) {
        const tr = this.db.transaction(name, 'readwrite');
        if (name instanceof Array) {
            return name.map(n => tr.objectStore(n));
        } else {
            return tr.objectStore(name);
        }
    }

    config_save(key, value) {
        const store = this.open_rw('config');
        store.put({key, value});
        this[key] = value;
    }

    async get_voices() {
        const store = this.open_read('voices');
        const list = await DataHolder.to_promise(store.getAll());
        list.sort((a, b) => a.order - b.order);
        const ret = [];
        for (const row of list) {
            if (DataHolder.#is_valid_voice(row.value)) {
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
            voice.height instanceof Array &&
            voice.height.length === 7 &&
            voice.width instanceof Array &&
            voice.width.length === 7 &&
            voice.freq instanceof Array &&
            voice.freq.length === 7 &&
            voice.freqadd instanceof Array &&
            voice.freqadd.length === 7;
    }
    static #trim_voice_data(v0) {
        const v = {};
        for (const k in v0) {
            if (v0[k] instanceof Array || typeof(v0[k]) !== 'object') {
                v[k] = v0[k];
            }
        }
        return v;
    }
    save_voice(voice, index) {
        const store = this.open_rw('voices');
        store.put({order: index, value: DataHolder.#trim_voice_data(voice)});
    }
    async save_all_voices(voices) {
        const store = this.open_rw('voices');
        const count = await DataHolder.to_promise(store.count());

        for (let i = 0; i < voices.length; i++) {
            store.put({order: i, value: DataHolder.#trim_voice_data(voices[i])});
        }
        for (let i = voices.length; i < count; i++) {
            store.delete(i);
        }
    }

    async get_all_projects() {
        const store = this.open_read('projects');
        const list = await DataHolder.to_promise(store.getAll());
        list.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
        return list;
    }
    save_project(name, value) {
        const store = this.open_rw('projects');
        store.put({name, value});
    }
    delete_project(name) {
        const store = this.open_rw('projects');
        store.delete(name);
    }

    async get_dic_count(lang) {
        const [alias_store, words_store] = this.open_read([`${lang}_alias`, `${lang}_words`]);
        const c = await Promise.all([
            DataHolder.to_promise(alias_store.count()),
            DataHolder.to_promise(words_store.count())
        ]);
        return c[0] + c[1];
    }

    async get_dic(lang) {
        const [alias_store, words_store] = this.open_read([`${lang}_alias`, `${lang}_words`]);
        return await Promise.all([
            DataHolder.to_promise(alias_store.getAll()),
            DataHolder.to_promise(words_store.getAll())
        ]);
    }
    async get_dic_as_file(lang) {
        const [alias_src, words_src] = await this.get_dic(lang);
        const alias = alias_src.map(row => row.s + "|" + row.d + "\n").sort();
        const words = words_src.map(row => [row.w, row.k, ...row.v].join("|") + "\n").sort();

        const ret = [];
        for (const line of alias) {
            ret.push(line);
        }
        ret.push("=\n");
        for (const line of words) {
            ret.push(line);
        }
        return new Blob(ret);
    }
    async set_dic(lang, dic) {
        const [alias_store, words_store] = this.open_rw([`${lang}_alias`, `${lang}_words`]);

        await Promise.all([
            DataHolder.to_promise(alias_store.clear()),
            DataHolder.to_promise(words_store.clear())
        ]);

        for (const obj of dic[0]) {
            alias_store.put(obj);
        }
        for (const obj of dic[1]) {
            words_store.put(obj);
        }
        return dic;
    }
}
