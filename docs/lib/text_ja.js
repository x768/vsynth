class JaWord
{
    constructor(type, a) {
        // ' ':pause
        // n:noun
        // m:prefix
        // c:combined noun
        // v:verb V:verb noun
        // s:single kanji
        // p:proper
        // z:hiragana(no dic), Z:katakana(no dic)
        this.type = type.length > 1 ? type[0] : type;
        this.a = a ?? [];
        this.accent = -1;
        this.left = type.length < 2 || type[1] !== '/';
        this.right = type.length < 3 || type[2] !== '/';
    }
    static split(a, s) {
        for (const m of s.matchAll(/(ky|kw|k|gy|gw|g~|g|sh|sy|s|j|zy|z|ts|ty|t|ch|d|ny|n|hy|h|f|by|b|py|p|q|my|m|y|ry|r|w)?([aiueo])?/gi)) {
            if (m[0] !== '') a.push(m[0]);
        }
    }
    static parse(type, s) {
        const a = [];
        JaWord.split(a, s);
        return new JaWord(type, a);
    }
    add(c) {
        this.a.push(c);
    }
    ends_with(c) {
        return this.a.length > 0 && this.a.at(-1).endsWith(c);
    }
    test_katakana_seg(c) {
        if (this.voice_len() < 3) return true;
        return !/[aiueo]/.test(c);
    }
    voice_len() {
        let i = 0;
        for (const c of this.a) {
            if (/[aiueo]/.test(c)) i++;
        }
        return i;
    }
    allow_prefix() {
        return 'nMsZvV'.indexOf(this.type) >= 0 && this.right;
    }
    #keep_accent(w2) {
        this.accent = w2.accent !== -1 ? this.a.length + w2.accent : this.accent;
    }
    #border_accent(w2) {
        if (w2.a.length <= 1) {
            this.accent = -1;
        } else if (w2.a.length <= 1) {
            this.accent = this.a.length - 1;
        } else {
            this.accent = this.a.length;
        }
    }
    merge(w2) {
        if (!this.right || !w2.left) {
            return false;
        }
        switch (this.type + w2.type) {
        case 'ns':
            this.#border_accent(w2);
            this.type = 'n';
            break;
        case 'nn':
        case 'sn':
        case 'nZ':
        case 'ZZ':
        case 'Zn':
        case 'Zs':
            this.#border_accent(w2);
            this.type = 'c';
            break;
        case 'sV':
            this.#keep_accent(w2);
            this.type = 'v';
            break;
        case 'Zc':
            this.#keep_accent(w2);
            this.type = 'c';
            break;
        case 'nv':
        case 'nc':
            if (this.accent !== -1) {
                return false;
            }
            this.#keep_accent(w2);
            this.type = 'v';
            break;
        case 'mn':
        case 'ms':
        case 'mv':
        case 'mV':
            if (w2.accent !== -1) {
                this.accent = w2.accent + 1;
            }
            this.left = false;
            this.type = 'n';
            break;
        case 'ns':
            if (this.accent !== -1) {
                return false;
            }
            this.#border_accent(w2);
            this.type = 'c';
            break;
        case 'Vz':
        case 'Vv':
            this.accent = -1;
            this.type = 'v';
            break;
        case 'VV':
            this.accent = -1;
            break;
        default:
            return false;
        }
        this.a.push(...w2.a);
        return true;
    }
    toString() {
        // for debug
        if (this.type === ' ') {
            return ' / ';
        }
        let s = (this.left ? '<' : '[') + this.type + (this.right ? '>' : ']');
        if (this.accent >= 0) {
            for (let i = 0; i < this.a.length; i++) {
                if (i === this.accent) {
                    s += this.a[i] + '↓';
                } else {
                    s += this.a[i] + ' ';
                }
            }
        } else {
            s += this.a.join(' ') + ' ';
        }
        return s;
    }
    to_roman() {
        const ret = [];
        let hi = this.accent === 0;
        for (let i = 0; i < this.a.length; i++) {
            const c = this.a[i];
            ret.push(hi ? c.toUpperCase() : c);
            if (i === this.accent) {
                hi = false;
            } else if (i === 0) {
                hi = true;
            }
        }
        return ret.join('');
    }
}

export class JaReading
{
    static ALIAS = {
        ',':' ', '.':' ',
        '，':' ', '．':' ',
        '[':'(', ']':')',
        '{':'(', '}':')',
        '　':' ', '・':' ',
        '、':' ', '。':' ',
        '〈':'(', '〉':')',
        '《':'(', '》':')',
        '「':'(', '」':')',
        '『':'(', '』':')',
        '【':'(', '】':')',
        '〔':'(', '〕':')',
        '〖':'(', '〗':')',
        '〘':'(', '〙':')',
        '〚':'(', '〛':')',
        '（':'(', '）':')',
    };
    static KANA = {
        'ア':'a', 'イ':'i', 'ウ':'u', 'エ':'e', 'オ':'o',
        'カ':'ka', 'ガ':'ga', 'キ':'ki', 'ギ':'gi', 'ク':'ku', 'グ':'gu', 'ケ':'ke', 'ゲ':'ge', 'コ':'ko', 'ゴ':'go',
        'サ':'sa', 'ザ':'za', 'シ':'shi', 'ジ':'ji', 'ス':'su', 'ズ':'zu', 'セ':'se', 'ゼ':'ze', 'ソ':'so', 'ゾ':'zo',
        'タ':'ta', 'ダ':'da', 'チ':'chi', 'ヂ':'ji', 'ッ':'q', 'ツ':'tsu', 'ヅ':'zu', 'テ':'te', 'デ':'de', 'ト':'to', 'ド':'do',
        'ナ':'na', 'ニ':'ni', 'ヌ':'nu', 'ネ':'ne', 'ノ':'no',
        'ハ':'ha', 'バ':'ba', 'パ':'pa',
        'ヒ':'hi', 'ビ':'bi', 'ピ':'pi',
        'フ':'fu', 'ブ':'bu', 'プ':'pu',
        'ヘ':'he', 'ベ':'be', 'ペ':'pe',
        'ホ':'ho', 'ボ':'bo', 'ポ':'po',
        'マ':'ma', 'ミ':'mi', 'ム':'mu', 'メ':'me', 'モ':'mo',
        'ヤ':'ya', 'ユ':'yu', 'ヨ':'yo',
        'ラ':'ra', 'リ':'ri', 'ル':'ru', 'レ':'re', 'ロ':'ro',
        'ワ':'wa', 'ヲ':'o', 'ン':'n', 'ヴ':'bu',
    };
    static KANA_A = {
        'ウ':'w',
        'キ':'ky', 'ギ':'gy', 'ク':'kw', 'グ':'gw',
        'シ':'sh', 'ジ':'j', 'ス':'s', 'ズ':'z',
        'チ':'ch', 'ヂ':'j', 'ツ':'ts', 'ヅ':'z', 'テ':'t', 'デ':'d', 'ト':'t', 'ド':'d',
        'ニ':'ny',
        'ヒ':'hy', 'ビ':'by', 'ピ':'py', 'フ':'f',
        'ミ':'my',
        'リ':'ry',
        'ヴ':'b',
    };
    static KANA_B = {
        'ァ':'a', 'ィ':'i', 'ゥ':'u', 'ェ':'e', 'ォ':'o',
        'ャ':'a', 'ュ':'u', 'ョ':'o', 'ヮ':'a',
    };
    static EXTRACT = {
        'あ':'*a', 'い':'*aikgyw', 'う':'*aw', 'え':'*ayw', 'お':'*aw',
        'か':'*ki', 'き':'*ki', 'く':'*ki', 'け':'*ki', 'こ':'*k',
        'が':'*g', 'ぎ':'*g', 'ぐ':'*g', 'げ':'*g', 'ご':'*g',
        'さ':'*si', 'し':'*s', 'す':'*s', 'せ':'*s', 'そ':'*si',
        'ざ':'*z', 'じ':'*z', 'ず':'*zd', 'ぜ':'*z', 'ぞ':'*z',
        'た':'*t', 'ち':'*t', 'つ':'*t', 'て':'*t', 'と':'*t',
        'だ':'*d', 'ぢ':'*d', 'づ':'*d', 'で':'*d', 'ど':'*d',
        'な':'*n', 'に':'*n', 'ぬ':'*n', 'ね':'*n', 'の':'*n',
        'は':'*h', 'ひ':'*h', 'ふ':'*h', 'へ':'*h', 'ほ':'*h',
        'ば':'*b', 'び':'*b', 'ぶ':'*b', 'べ':'*b', 'ぼ':'*b',
        'ま':'*m', 'み':'*m', 'む':'*m', 'め':'*m', 'も':'*m',
        'や':'*y', 'ゆ':'*y', 'よ':'*y',
        'ら':'*r', 'り':'*r', 'る':'*r', 'れ':'*r', 'ろ':'*r',
        'わ':'*w', 'ん':'*nbm', 'っ':'*ktrw',
    };
    static LATIN_READING = {
        A:'ee', B:'bii', C:'shii', D:'dii', E:'ii', F:'efu', G:'jii',
        H:'eichi', I:'ai', J:'jee', K:'kee', L:'eru', M:'emu', N:'enu',
        O:'oo', P:'pii', Q:'kyuu', R:'aaru', S:'esu', T:'tii', U:'yuu',
        V:'bui', W:'daburu', X:'ekkusu', Y:'wai', Z:'zetto',
    };
    static DIGIT_READING = {
        '0': 'ree', '1': 'ichi', '2': 'ni', '3': 'san', '4': 'yon',
        '5': 'go', '6': 'roku', '7': 'nana', '8': 'hachi', '9': 'kyuu',
    };

    static is_kanji(c) {
        return c >= 0x3400;
    }
    static is_hiragana(c) {
        return c >= 0x3041 && c <= 0x3096;
    }
    static is_katakana(c) {
        return c >= 0x30A1 && c <= 0x30FA;
    }
    static is_kana(c) {
        return c >= 0x3041 && c <= 0x3096 || c >= 0x30A1 && c <= 0x30FA;
    }
    static is_upper(c) {
        return c >= 0x41 && c <= 0x5A;
    }
    static is_lower(c) {
        return c >= 0x61 && c <= 0x7A;
    }
    static is_digit(c) {
        return c >= 0x30 && c <= 0x39;
    }
    static to_katakana(ch) {
        const c = ch.charCodeAt(0);
        if (JaReading.is_hiragana(c)) {
            return String.fromCharCode(c + 0x60);
        }
        return ch;
    }
    static to_voiced_kana(c) {
        if (c !== '' && 'かきくけこさしすせそたちつてとはひふへほカキクケコサシスセソタチツテトハヒフヘホ'.indexOf(c) >= 0) {
            ret.push(String.fromCharCode(c.charCodeAt(0) + 1));
        } else {
            ret.push(c);
        }
    }
    static to_voiceless_kana(c) {
        if (c !== '' && 'がぎぐげござじずぜぞだぢづでどばびぶべぼガギグゲゴザジズゼゾダヂヅデドバビブベボ'.indexOf(c) >= 0) {
            ret.push(String.fromCharCode(c.charCodeAt(0) - 1));
        } else {
            ret.push(c);
        }
    }
    static get_consonant(c) {
        c = c.substring(0, 1);
        return c === 'c' ? 't' : c === 'j' ? 'z' : c;
    }
    static add_break(ret) {
        if (ret.length > 0 && ret.at(-1).type !== ' ') {
            ret.push(new JaWord(' ', [' ']));
        }
    }

    static parse(src) {
        let is_alias = true;
        const alias = [];
        const dic = [];
        for (const line of src) {
            if (line === '=') {
                is_alias = false;
            } else if (is_alias) {
                const a = line.split('|');
                if (a.length >= 2) {
                    const obj = {s:a[0], d:a[1]};
                    alias.push(obj);
                }
            } else {
                const a = line.split('|');
                if (a.length >= 3) {
                    const w = a.shift();
                    const k = a.shift();
                    const obj = {w:w, k:k, v:a};
                    dic.push(obj);
                }
            }
        }
        return [alias, dic];
    }

    constructor() {
        this.dic = {};
        this.alias = {};
        this.count = 0;
    }
    load_src(src) {
        const [alias, dic] = JaReading.parse(src.split("\n"));
        this.load(alias, dic);
    }
    load(alias, dic) {
        this.count = 0;
        this.dic = {};
        this.alias = {};

        for (const k in JaReading.ALIAS) {
            this.alias[k] = JaReading.ALIAS[k];
        }
        for (const row of alias) {
            this.alias[row.s] = row.d;
        }
        for (const row of dic) {
            const word = row.w;
            let d = this.dic;
            for (const k2 of word) {
                let d2 = d[k2];
                if (!d2) {
                    d2 = {};
                    d[k2] = d2;
                }
                d = d2;
            }
            d['?'] = row.k;

            const v = row.v;
            d['$'] = v[0];
            if (v.length > 1) {
                // アクセント核(表記上は1 origin)
                d['!'] = Number.parseInt(v[1]) - 1;
            }
            if (v.length > 2) {
                d['$x'] = v[2];
            }
            if (v.length > 3) {
                d['!x'] = Number.parseInt(v[3]) - 1;
            }
            this.count++;
        }
        this.dic['*o'] = {
            '$':'o',
            '?':'m',
        };
        this.dic['*go'] = {
            '$':'go',
            '?':'m',
        };
    }
    #replace_alias(src) {
        const ret = [];
        let prev_upper = false;
        let prev_lower = false;
        for (const c of src) {
            const cd = c.charCodeAt(0);
            const upper = JaReading.is_upper(cd);
            const lower = JaReading.is_lower(cd);
            if (upper || lower) {
                if (lower && !prev_upper && !prev_lower) {
                    ret.push(String.fromCharCode(cd - 0x20));
                } else if (upper && prev_lower) {
                    ret.push('_');
                    ret.push(c);
                } else {
                    ret.push(c);
                }
            } else if (c === '々') {
                if (prev !== '') ret.push(prev);
            } else if (c === 'ゝ' || c === 'ヽ') {
                ret.push(JaReading.to_voiceless_kana(prev));
            } else if (c === 'ゞ' || c === 'ヾ') {
                ret.push(JaReading.to_voiced_kana(prev));
            } else if (cd >= 0x0391 && cd <= 0x03A9) {
                ret.push(String.fromCharCode(cd + 0x20));
            } else {
                const ch = this.alias[c];
                if (ch) {
                    ret.push(ch);
                } else {
                    const cd = c.charCodeAt(0);
                    const prev = ret.length > 0 ? ret.at(-1) : '';
                    if ((prev === 'お' || prev === 'ご') && JaReading.is_kanji(cd)) {
                        ret[ret.length - 1] = prev === 'お' ? '*o' : '*go';
                        ret.push(c);
                    } else {
                        ret.push(c);
                    }
                }
            }
            prev_upper = upper;
            prev_lower = lower;
        }
        return ret;
    }
    #split_segments(src) {
        const ret = [];
        for (let i = 0; i < src.length; i++) {
            const ch = src[i];
            if (ch === ' ' || ch === '(' || ch === ')') {
                JaReading.add_break(ret);
                continue;
            } else if (ch === '_') {
                continue;
            }
            const prev = ret.length > 0 ? ret.at(-1) : null;
            {
                let k = i;
                let d = this.dic;
                let last = null;
                let last_k = 0;
                let type = 'n';
                let accent = -1;
                while (d && k < src.length) {
                    const c = src[k];
                    let c2 = null;
                    const d2 = d[c];
                    if (d2) {
                        d = d2;
                        if ('$' in d) {
                            last_k = k;
                            type = d['?'];
                            if (prev && prev.allow_prefix() && '$x' in d) {
                                last = d['$x'];
                                accent = '!x' in d ? d['!x'] : -1;
                            } else {
                                last = d['$'];
                                accent = '!' in d ? d['!'] : -1;
                            }
                        }
                    } else if ((c2 = JaReading.EXTRACT[c]) !== undefined) {
                        let d3 = null;
                        for (const c3 of c2) {
                            d3 = d[c3];
                            if (d3) {
                                if (c3 === 'i') {
                                    type = 'v';
                                    if ('!' in d3) {
                                        accent = d3['!'];
                                    } else if (c === 'い') {
                                        accent = k - i;
                                    } else {
                                        accent = 0;
                                    }
                                } else if ('ayw'.indexOf(c3) >= 0 && c === 'い' || 'きぎしじちぢにひびみり'.indexOf(c) >= 0) {
                                    type = 'V';
                                    accent = '!' in d3 ? d3['!'] : -1;
                                } else {
                                    type = 'v';
                                    if ('!' in d3) {
                                        accent = d3['!'];
                                    } else {
                                        accent = k - i;
                                    }
                                }
                                break;
                            }
                        }
                        d = d3;
                        if (d && '$' in d) {
                            if (prev && prev.allow_prefix() && '$x' in d) {
                                last = d['$x'];
                            } else {
                                last = d['$'];
                            }
                            last_k = k - 1;
                        }
                    } else {
                        break;
                    }
                    k++;
                }
                if (last) {
                    const word = JaWord.parse(type, last);
                    word.accent = accent;
                    if (prev && prev.type === 's' && type === 's') {
                        // 単一漢字を連結
                        prev.type = 'n';
                        prev.accent = -1;
                        prev.a.push(...word.a);
                    } else {
                        ret.push(word);
                    }
                    i = last_k;
                    continue;
                }
            }
            const chc = ch.charCodeAt(0);
            const is_hiragana = JaReading.is_hiragana(chc) || ch === 'ー';
            const is_katakana = JaReading.is_katakana(chc) || ch === 'ー';
            if (is_hiragana || is_katakana) {
                const kc = JaReading.to_katakana(ch);
                let new_ch = null;
                if (i + 1 < src.length) {
                    // 拗音
                    const b1 = JaReading.KANA_A[kc];
                    if (b1) {
                        const b2 = JaReading.KANA_B[JaReading.to_katakana(src[i + 1])];
                        if (b2) {
                            new_ch = b1 + b2;
                            i++;
                        }
                    }
                }
                if (new_ch) {
                } else if (kc === 'イ') {
                    // エイ→エエ
                    if (prev && prev.ends_with('e')) {
                        new_ch = 'e';
                    } else {
                        new_ch = 'i';
                    }
                } else if (kc === 'ウ') {
                    // オウ→オオ
                    if (prev && prev.ends_with('o')) {
                        new_ch = 'o';
                    } else {
                        new_ch = 'u';
                    }
                } else if (ch === 'ー') {
                    if (prev) {
                        const c1 = prev.a.at(-1);
                        const c2 = c1.substring(c1.length - 1);
                        if ('aiueo'.indexOf(c2) >= 0) {
                            new_ch = c2;
                        }
                    }
                } else if (ch === 'は') {
                    new_ch = 'wa';
                } else if (ch === 'へ') {
                    new_ch = 'e';
                } else {
                    const a = JaReading.KANA[kc];
                    if (a) {
                        new_ch = a;
                    }
                }
                if (prev && (prev.type === 'z' || prev.type === 'V' || prev.type === 'v') && is_hiragana) {
                    prev.a.push(new_ch);
                } else if (prev && prev.type === 'Z' && is_katakana) {
                    if (ch === 'ー' || prev.test_katakana_seg(new_ch)) {
                        prev.a.push(new_ch);
                    } else if (new_ch !== null) {
                        const w = new JaWord('Z', [new_ch]);
                        w.accent = 0;
                        ret.push(w);
                    }
                } else if (ch !== 'ー') {
                    const w = new JaWord(is_hiragana ? 'z' : 'Z', [new_ch]);
                    if (is_katakana) w.accent = 0;
                    ret.push(w);
                } else {
                    if (new_ch !== null) {
                        prev.a.push(new_ch);
                    }
                }
            } else if (JaReading.is_upper(chc) || JaReading.is_lower(chc)) {
                const begin = i;
                i++;
                let all_upper = true;
                while (i < src.length) {
                    const c2 = src[i].charCodeAt(0);
                    const upper = JaReading.is_upper(c2);
                    const lower = JaReading.is_lower(c2);
                    if (!upper && !lower) break;
                    if (!upper) all_upper = false;
                    i++;
                }
                const end = i;
                i--;
                if (all_upper) {
                    this.#latin_init_reading(ret, src, begin, end);
                } else if (end - begin === 1) {
                    this.#latin_init_reading(ret, [src[begin].toUpperCase()], begin, end);
                } else {
                    this.#roman_reading(ret, src, begin, end);
                }
            } else if (JaReading.is_digit(chc)) {
                const begin = i;
                i++;
                while (i < src.length) {
                    const c = src[i].charCodeAt(0);
                    if (!JaReading.is_digit(c) && c !== 0x2D) {
                        break;
                    }
                    i++;
                }
                const end = i;
                i--;
                this.#digit_reading(ret, src, begin, end);
            }
        }
        JaReading.add_break(ret);
        return ret;
    }
    #latin_init_reading(ret, src, begin, end) {
        const a = [];
        for (let i = begin; i < end; i++) {
            JaWord.split(a, JaReading.LATIN_READING[src[i]]);
        }
        const w = new JaWord('n', a);
        if (end - begin > 1) {
            w.accent = a.length - 2;
        } else {
            w.accent = 0;
        }
        ret.push(w);
    }
    #roman_reading(ret, src, begin, end) {
        const b = [];
        let prev = '';
        for (let i = begin; i <= end; i++) {
            let ch = i === end ? '_' : src[i].toLowerCase();

            if ('aiueo'.indexOf(ch) < 0) {
                switch (prev) {
                case 'c':
                    b[b.length - 1] = 'k';
                    b.push('u');
                    break;
                case 'k': case 'g': case 's': case 'z': case 'p': case 'b':
                case 'ts': case 'kus':
                    b.push('u');
                    break;
                case 't': case 'd':
                    b.push('o');
                    break;
                case 'ch': case 'j':
                    b.push('i');
                    break;
                case 'y':
                    b[b.length - 1] = 'i';
                    break;
                default:
                    if (prev[prev.length - 1] === 'y') {
                        const last = b.at(-1);
                        b[b.length - 1] = last.substring(0, last.length - 1) + 'i';
                    }
                    break;
                }
            } else if (prev === 'c') {
                switch (ch) {
                case 'a':
                case 'u':
                case 'o':
                    b[b.length - 1] = 'k';
                    break;
                case 'i':
                case 'e':
                    b[b.length - 1] = 's';
                    break;
                }
            }
            if (ch === 'l') {
                ch = 'r';
            } else if (ch === 'q') {
                ch = 'k';
            } else if (ch === 'v') {
                ch = 'b';
            } else if (ch === 'x') {
                ch = 'kus';
            }
            if (ch !== '_') b.push(ch);
            prev = ch;
        }
        if (b.length === 0) return;

        const w = JaWord.parse('n', b.join(''));
        if (w.a.length === 0) return;

        if (w.a.length <= 4) {
            w.accent = 0;
        } else {
            w.accent = w.a.length - 2;
        }
        ret.push(w);
    }
    #number_reading(ret, src, begin, end) {
        // TODO
    }

    #digit_reading(ret, src, begin, end) {
        let a = [];
        for (let i = begin; i < end; i++) {
            const ch = src[i];
            if (ch === '-') {
                const w = new JaWord('n//', a);
                w.accent = a.length - 2;
                ret.push(w);
                a = [];
                ret.push(new JaWord('z', ['no']));
                continue;
            }
            const s = JaReading.DIGIT_READING[ch];
            JaWord.split(a, s);
            if (a.length % 2 !== 0) {
                const c = a.at(-1).at(-1);
                a.push(c);
            }
            if (a.length >= 4) {
                const w = new JaWord('n//', a);
                w.accent = 2;
                ret.push(w);
                a = [];
            }
        }
        if (a.length > 0) {
            const w = new JaWord('n//', a);
            w.accent = 0;
            ret.push(w);
        }
    }

    #replace_sound(src) {
        let word2 = null;
        let c2 = '';
        for (const word of src) {
            for (let i = 0; i < word.a.length; i++) {
                const c = word.a[i];
                if (c2 === 'q') {
                    const cons = JaReading.get_consonant(c);
                    if (i === 0) {
                        if (word2) word2.a[word2.a.length - 1] = cons;
                    } else {
                        word.a[i - 1] = cons;
                    }
                }
                c2 = c;
            }
            if ((word.type === 'v' || word.type === 'V' || word.type === 'z') && word.accent === -1) {
                let len = word.a.length;
                let i = len - 1;
                if (word.a[i] === 'ka' || word.a[i] === 'to' || word.a[i] === 'ne' || word.a[i] === 'no' || word.a[i] === 'yo' || word.a[i] === 'wa') {
                    i--;
                    len--;
                }
                switch (word.a[i]) {
                case 'su':
                    if (word.a[i - 1] === 'de' || word.a[i - 1] === 'ma') {
                        // です/ます
                        word.accent = len - 2;
                    }
                    break;
                case 'ta':
                    if (word.a[i - 1] === 'shi') {
                        // した
                        word.accent = len - 3;
                    }
                    break;
                case 'o':
                    if (word.a[i - 1] === 'sho') {
                        // しょう
                        word.accent = len - 2;
                    }
                    break;
                case 'n':
                    word.accent = len - 2;
                    break;
                }
                if (word.accent === -1) {
                    for (let j = i; j >= 2; j--) {
                        if (word.a[j] === 'no') {
                            word.accent = j - 1;
                            break;
                        }
                    }
                }
            }
            word2 = word;
        }
    }
    #postprocess(src) {
        const ret = [];
        if (src.length === 0) return ret;

        let prev = src.at(-1);
        for (let i = src.length - 2; i >= 0; i--) {
            const word = src[i];
            if (!word.merge(prev)) {
                ret.unshift(prev);
            }
            prev = word;
        }
        ret.unshift(prev);
        return ret;
    }

    static #to_str(src) {
        const ret = [];
        let prev = '';
        let hi = false;
        let accent = -1;
        for (const word of src) {
            if (word.type === ' ') {
                prev = '';
                hi = false;
                accent = -1;
                ret.push(' ');
                continue;
            }
            if (word.type !== 'z' || word.accent >= 0) {
                accent = word.accent;
                hi = word.accent === 0;
            }
            for (let i = 0; i < word.a.length; i++) {
                const c = word.a[i];
                if (prev === 'n' && 'aiueoy'.indexOf(c[0]) >= 0) {
                    ret.push("'");
                }
                ret.push(hi ? c.toUpperCase() : c);
                if (accent === 0) {
                    hi = false;
                } else if ((prev === '' || word.type !== 'z') && i === 0) {
                    hi = true;
                }
                if (accent >= 0) accent--;
                prev = c;
            }
        }
        return ret.join('');
    }

    conv(src) {
        const a1 = this.#replace_alias(src);
        const a2 = this.#split_segments(a1);
        this.#replace_sound(a2);
        this.debug2 = a2.join('');
        const a3 = this.#postprocess(a2);
        this.debug1 = a3.join('');
        return JaReading.#to_str(a3);
    }
}
