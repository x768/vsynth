//#dynload _lang_mods['./lang/ja.js']
export const params = {
    speed: 480,
    accent: 400,
};
export const variants = {
    'std': {
        name: '標準語',
        voiceless: true,
        reduce_pitch: true,
    },
};

class Word
{
    constructor(type, a, accent = -1) {
        // ' ':pause
        // n:noun
        // N:noun (fix accent)
        // m:prefix
        // c:combined noun
        // v:verb V:verb noun
        // s:single kanji
        // p:proper
        // z:hiragana(no dic), Z:katakana(no dic)
        this.type = type.length > 1 ? type[0] : type;
        if (a instanceof Array) {
            this.a = a;
        } else if (a) {
            const b = [];
            Word.split(b, a);
            this.a = b;
        } else {
            this.a = [];
        }
        this.accent = accent;
        this.left = type.length < 2 || type[1] !== '/';
        this.right = type.length < 3 || type[2] !== '/';
    }
    static split(a, s) {
        for (const m of s.matchAll(/(ky|kw|k|gy|gw|g~|g|sh|sy|s|j|zy|z|ts|ty|t|ch|d|ny|n|hy|h|f|by|b|py|p|q|my|m|y|ry|r|w)?([aiueo])?/gi)) {
            if (m[0] !== '') a.push(m[0]);
        }
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
        return this.right && 'nNsZ'.indexOf(this.type) >= 0;
    }
    #keep_accent(w2) {
        this.accent = w2.accent !== -1 ? this.a.length + w2.accent : this.accent;
    }
    #border_accent(w2) {
        if (w2.a.length <= 2) {
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
            this.type = 'N';
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
        case 'nN':
        case 'sN':
        case 'ZN':
            this.#keep_accent(w2);
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
            if (this.accent !== -1) return false;
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
        case 'Vz':
            this.accent = -1;
            this.type = 'v';
            break;
        case 'Vv':
            this.#keep_accent(w2);
            this.type = 'v';
            break;
        case 'VV':
            this.accent = -1;
            break;
        case '11':
            this.accent = 2;
            this.type = '2';
            break;
        case '10':
            this.type = '2';
            break;
        case '17':
            this.#keep_accent(w2);
            this.type = '2';
            break;
        case '18': // 千
            this.accent = this.a.length;
            this.type = '2';
            break;
        case '19':
            this.accent = this.a.length;
            this.type = '2';
            break;
        case '09':
            this.accent = this.a.length - 1;
            this.type = '7';
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

export class ToPhonemic
{
    static ALIAS = {
        ',':' ',
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
        '0':[0, 're', 'e'], '1':[-1, 'i', 'chi'], '2':[-1, 'ni'], '3':[0, 'sa', 'n'], '4':[0, 'yo', 'n'],
        '5':[-1, 'go'], '6':[-1, 'ro', 'ku'], '7':[0, 'na', 'na'], '8':[-1, 'ha', 'chi'], '9':[0, 'kyu', 'u'],
    };
    static NUMBER_GROUP_READING = [
        [0, 'ju', 'u'], [-1, 'hya', 'ku'], [0, 'se', 'n'], [0, 'ma', 'n'], [-1, 'o', 'ku'], [-1, 'cho', 'o'], [-1, 'ke', 'e'],
    ];

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
        if (ToPhonemic.is_hiragana(c)) {
            return String.fromCharCode(c + 0x60);
        }
        return ch;
    }
    static #to_voiced_kana(c) {
        if (c !== '' && 'かきくけこさしすせそたちつてとはひふへほカキクケコサシスセソタチツテトハヒフヘホ'.indexOf(c) >= 0) {
            return String.fromCharCode(c.charCodeAt(0) + 1);
        } else {
            return c;
        }
    }
    static #to_voiceless_kana(c) {
        if (c !== '' && 'がぎぐげござじずぜぞだぢづでどばびぶべぼガギグゲゴザジズゼゾダヂヅデドバビブベボ'.indexOf(c) >= 0) {
            return String.fromCharCode(c.charCodeAt(0) - 1);
        } else {
            return c;
        }
    }
    static #get_consonant(c) {
        c = c.substring(0, 1);
        return c === 'c' ? 't' : c === 'j' ? 'z' : c;
    }
    static #add_break(ret) {
        if (ret.length > 0 && ret.at(-1).type !== ' ') {
            ret.push(new Word(' ', [' ']));
        }
    }
    static #sound_change(w1, w2) {
        switch (w1.a.at(-1) + w2.a[0]) {
        case 'nhya':
            if (w1.a[0] === 'sa') w2.a[0] = 'bya';
            break;
        case 'kuhya': case 'chihya':
            w1.a[1] = 'p';
            w2.a[0] = 'pya';
            break;
        case 'nse':
            if (w1.a[0] === 'sa') w2.a[0] = 'ze';
            break;
        case 'chise':
            w1.a[1] = 's';
            break;
        case 'chicho':
            w1.a[1] = 't';
            break;
        }
    }

    constructor() {
        this.dic = {};
        this.alias = {};
        this.count = 0;
    }

    load(dic) {
        this.count = 0;
        this.dic = {};
        this.alias = {};

        for (const k in ToPhonemic.ALIAS) {
            this.alias[k] = ToPhonemic.ALIAS[k];
        }
        for (const row of dic[0]) {
            this.alias[row.s] = row.d;
            this.count++;
        }
        for (const row of dic[1]) {
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
                // 複合語で読みが変わる場合 e.g. 川(kawa) → 〜川(gawa)
                d['$x'] = v[2];
            }
            if (v.length > 3) {
                d['!x'] = Number.parseInt(v[3]) - 1;
            }
            this.count++;
        }
        // 接頭辞「お」「ご」
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
        let prev_ch = '';
        for (const c of src) {
            const cd = c.charCodeAt(0);
            const upper = ToPhonemic.is_upper(cd);
            const lower = ToPhonemic.is_lower(cd);
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
                ret.push(prev_ch);
                ret.push(''); // 結合阻止
            } else if (c === 'ゝ' || c === 'ヽ') {
                ret.push(ToPhonemic.#to_voiceless_kana(prev_ch));
            } else if (c === 'ゞ' || c === 'ヾ') {
                ret.push(ToPhonemic.#to_voiced_kana(prev_ch));
            } else if (cd >= 0x0391 && cd <= 0x03A9) {
                ret.push(String.fromCharCode(cd + 0x20));
            } else {
                const ch = this.alias[c];
                if (ch) {
                    ret.push(ch);
                } else {
                    const cd = c.charCodeAt(0);
                    const prev = ret.length > 0 ? ret.at(-1) : '';
                    if ((prev === 'お' || prev === 'ご') && ToPhonemic.is_kanji(cd)) {
                        ret[ret.length - 1] = prev === 'お' ? '*o' : '*go';
                        ret.push(c);
                    } else {
                        ret.push(c);
                    }
                }
            }
            prev_ch = c;
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
                ToPhonemic.#add_break(ret);
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
                    let c2;
                    const d2 = d[c];
                    if (d2) {
                        d = d2;
                        if ('$' in d) {
                            last_k = k;
                            type = d['?'];
                            if (prev && prev.allow_prefix() && '$x' in d) {
                                last = d['$x'];
                                accent = d['!x'] ?? -1;
                            } else {
                                last = d['$'];
                                accent = d['!'] ?? -1;
                            }
                        }
                    } else if ((c2 = ToPhonemic.EXTRACT[c]) !== undefined) {
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
                            if (prev && prev.allow_prefix()) {
                                last = d['$x'] ?? d['$'];
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
                    const word = new Word(type, last, accent);
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
            const is_hiragana = ToPhonemic.is_hiragana(chc) || ch === 'ー';
            const is_katakana = ToPhonemic.is_katakana(chc) || ch === 'ー';
            if (is_hiragana || is_katakana) {
                const kc = ToPhonemic.to_katakana(ch);
                let new_ch = null;
                if (i + 1 < src.length) {
                    // 拗音
                    const b1 = ToPhonemic.KANA_A[kc];
                    if (b1) {
                        const b2 = ToPhonemic.KANA_B[ToPhonemic.to_katakana(src[i + 1])];
                        if (b2) {
                            new_ch = b1 + b2;
                            i++;
                        }
                    }
                }
                if (new_ch) {
                    // do nothing
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
                    const a = ToPhonemic.KANA[kc];
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
                        const w = new Word('Z', [new_ch]);
                        w.accent = 0;
                        ret.push(w);
                    }
                } else if (ch !== 'ー') {
                    const w = new Word(is_hiragana ? 'z' : 'Z', [new_ch]);
                    if (is_katakana) w.accent = 0;
                    ret.push(w);
                } else {
                    if (new_ch !== null) {
                        prev.a.push(new_ch);
                    }
                }
            } else if (ToPhonemic.is_upper(chc) || ToPhonemic.is_lower(chc)) {
                const begin = i;
                i++;
                let all_upper = true;
                while (i < src.length) {
                    const c2 = src[i].charCodeAt(0);
                    const upper = ToPhonemic.is_upper(c2);
                    const lower = ToPhonemic.is_lower(c2);
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
            } else if (ToPhonemic.is_digit(chc) || (i + 1 < src.length && chc == 0x2E && ToPhonemic.is_digit(src[i + 1].charCodeAt(0)))) {
                const begin = i;
                i++;
                let digits = chc === 0x30 || chc == 0x2E; // 0 or .
                while (i < src.length) {
                    const c = src[i].charCodeAt(0);
                    if (c === 0x2D) { // -
                        digits = true;
                    } else if (!ToPhonemic.is_digit(c)) {
                        break;
                    }
                    i++;
                }
                const end = i;
                i--;
                if (digits) {
                    this.#digit_reading(ret, src, begin, end);
                } else {
                    this.#number_reading(ret, src, begin, end);
                }
            }
        }
        ToPhonemic.#add_break(ret);
        return ret;
    }
    #latin_init_reading(ret, src, begin, end) {
        const a = [];
        for (let i = begin; i < end; i++) {
            Word.split(a, ToPhonemic.LATIN_READING[src[i]]);
        }
        const w = new Word('n', a);
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

        const w = new Word('n', b.join(''));
        if (w.a.length === 0) return;

        if (w.a.length <= 4) {
            w.accent = 0;
        } else {
            w.accent = w.a.length - 2;
        }
        w.left = false;
        w.right = false;
        ret.push(w);
    }

    #number_reading(ret, src, begin, end) {
        const a = [];
        let n = 0;
        let m = 2;
        let group = false;
        for (let i = end - 1; i >= begin; i--) {
            const ch = src[i];
            if (ch !== '0') {
                if (group) {
                    const r = ToPhonemic.NUMBER_GROUP_READING[m];
                    a.unshift(new Word('9', r.slice(1), r[0]));
                    group = false;
                }
                if (n > 0) {
                    const r = ToPhonemic.NUMBER_GROUP_READING[n - 1];
                    a.unshift(new Word(n === 3 ? '8' : '0', r.slice(1), r[0]));
                }
                if (n === 0 || ch !== '1' || (n === 3 && m > 2)) {
                    const r = ToPhonemic.DIGIT_READING[ch];
                    a.unshift(new Word('1', r.slice(1), r[0]));
                }
            }
            n++;
            if (n > 3) {
                n = 0;
                m++;
                if (m < ToPhonemic.NUMBER_GROUP_READING.length) {
                    group = true;
                }
            }
        }
        for (let i = 0; i < a.length; i++) {
            if (i < a.length - 1) {
                ToPhonemic.#sound_change(a[i], a[i + 1]);
            }
            ret.push(a[i]);
        }
    }

    #digit_reading(ret, src, begin, end) {
        let odd = false;
        for (let i = begin; i < end; i++) {
            const ch = src[i];
            if (ch === '-') {
                ret.push(new Word('z', ['no']));
                odd = false;
            } else if (ch === '.') {
                ret.push(new Word('z', ['te', 'n']));
                odd = false;
            } else {
                const r = ToPhonemic.DIGIT_READING[ch];
                const a = r.slice(1);
                if (a.length % 2 !== 0) {
                    // ni -> nii
                    const c = a.at(-1).at(-1);
                    a.push(c);
                }
                ret.push(new Word(odd ? '1 /' : '1/', a, r[0]));
                odd = !odd;
            }
        }
    }

    #replace_sound(src) {
        let word2 = null;
        let c2 = '';
        for (const word of src) {
            for (let i = 0; i < word.a.length; i++) {
                const c = word.a[i];
                if (c2 === 'q') {
                    const cons = ToPhonemic.#get_consonant(c);
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
                if (i >= 2) {
                    const c3 = word.a[i - 1];
                    switch (word.a[i]) {
                    case 'o':
                        if (c3 === 'sho') {
                            // しょう
                            word.accent = len - 2;
                        }
                        break;
                    case 'su':
                        if (c3 === 'de') {
                            // です
                            word.accent = len - 3;
                        } else if (c3 === 'ma') {
                            // ます
                            word.accent = len - 2;
                        }
                        break;
                    case 'ta':
                        if (c3 === 'shi') {
                            // した
                            word.accent = len - 3;
                        }
                        break;
                    case 'n':
                        word.accent = len - 2;
                        break;
                    case 'ri':
                    case 'ru':
                    case 're':
                        if (c3 === 'a' || c3 === 'na') {
                            // ある/なる
                            word.accent = len - 2;
                        }
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
                if (word.type !== 'z' || !hi) hi = word.accent === 0;
            }
            for (let i = 0; i < word.a.length; i++) {
                const c = word.a[i];
                if (prev === 'n' && 'aiueoy'.indexOf(c[0]) >= 0) {
                    ret.push("'");
                }
                ret.push(hi ? c.toUpperCase() : c);
                if (accent === 0) {
                    hi = false;
                } else if ((prev === '' || word.type !== 'z' || accent > 0) && i === 0) {
                    hi = true;
                }
                if (accent >= 0) accent--;
                prev = c;
            }
        }
        return ret;
    }

    conv(src) {
        const a1 = this.#replace_alias(src);
        const a2 = this.#split_segments(a1);
        this.#replace_sound(a2);
        this.debug2 = a2.join('');
        const a3 = this.#postprocess(a2);
        this.debug1 = a3.join('');
        return ToPhonemic.#to_str(a3).join('');
    }
}

class Mola
{
    static kana = {
          a:'ア',    i:'イ',    u:'ウ',    e:'エ',    o:'オ',
         ka:'カ',   ki:'キ',   ku:'ク',   ke:'ケ',   ko:'コ',
        kya:'キャ',kyi:'キ',  kyu:'キュ',kye:'キェ',kyo:'キョ',
        kwa:'クヮ',kwi:'クィ',kwu:'ク',  kwe:'クェ',kwo:'クォ',
         ga:'ガ',   gi:'ギ',   gu:'グ',   ge:'ゲ',   go:'ゴ',
        gya:'ギャ',gyi:'ギ',  gyu:'ギュ',gye:'ギェ',gyo:'ギョ',
        gwa:'グヮ',gwi:'グィ',gwu:'グ',  gwe:'グェ',gwo:'グォ',
      'g~a':'カ゚','g~i':'キ゚','g~u':'ク゚','g~e':'ケ゚','g~o':'コ゚',
     'g~ya':'キ゚ャ','g~yi':'キ゚','g~yu':'キ゚ュ','g~ye':'キ゚ェ','g~yo':'キ゚ョ',
         sa:'サ',   si:'スィ', su:'ス',   se:'セ',   so:'ソ',
        sha:'シャ',shi:'シ',  shu:'シュ',she:'シェ',sho:'ショ',
         za:'ザ',   zi:'ズィ', zu:'ズ',   ze:'ゼ',   zo:'ゾ',
         ja:'ジャ', ji:'ジ',   ju:'ジュ', je:'ジェ', jo:'ジョ',
         ta:'タ',   ti:'ティ', tu:'トゥ', te:'テ',   to:'ト',
        cha:'チャ',chi:'チ',  chu:'チュ',che:'チェ',cho:'チョ',
        tsa:'ツァ',tsi:'ツィ',tsu:'ツ',  tse:'ツェ',tso:'ツォ',
         da:'ダ',   di:'ディ', du:'ドゥ', de:'デ',   do:'ド',
         na:'ナ',   ni:'ニ',   nu:'ヌ',   ne:'ネ',   no:'ノ',
        nya:'ニャ',nyi:'ニ',  nyu:'ニュ',nye:'ニェ',nyo:'ニョ',
         ha:'ハ',   hi:'ヒ',   hu:'ヒュ', he:'ヘ',   ho:'ホ',
        hya:'ヒャ',hyi:'ヒ',  hyu:'ヒュ',hye:'ヒェ',hyo:'ヒョ',
         fa:'ファ', fi:'フィ', fu:'フ',   fe:'フェ', fo:'フォ',
         ba:'バ',   bi:'ビ',   bu:'ブ',   be:'ベ',   bo:'ボ',
        bya:'ビャ',byi:'ビ',  byu:'ビュ',bye:'ビェ',byo:'ビョ',
         pa:'パ',   pi:'ピ',   pu:'プ',   pe:'ペ',   po:'ポ',
        pya:'ピャ',pyi:'ピ',  pyu:'ピュ',pye:'ピェ',pyo:'ピョ',
         ma:'マ',   mi:'ミ',   mu:'ム',   me:'メ',   mo:'モ',
        mya:'ミャ',myi:'ミ',  myu:'ミュ',mye:'ミェ',myo:'ミョ',
         ya:'ヤ',   yi:'イ',   yu:'ユ',   ye:'イェ', yo:'ヨ',
         ra:'ラ',   ri:'リ',   ru:'ル',   re:'レ',   ro:'ロ',
        rya:'リャ',ryi:'リ',  ryu:'リュ',rye:'リェ',ryo:'リョ',
         wa:'ワ',   wi:'ウィ', wu:'ウ',   we:'ウェ', wo:'ウォ',
          k:'ク',   ky:'キ',    g:'グ',   gy:'ギ', 'g~':'ング',
          s:'ス',   sh:'シ',    z:'ズ',    j:'ジ',    t:'ト',
         ch:'チ',    d:'ド',    n:'ン',   ny:'ニ',    h:'ハ',
          f:'フ',   hy:'ヒ',    b:'ブ',   by:'ビ',    p:'プ',
         py:'ピ',    m:'ム',   my:'ミ',    y:'イ',    r:'ル',
         ry:'リ',    w:'ウ',    q:'ッ',
    };

    constructor(c, v, c_name, v_name, pitch) {
        this.c = c;
        this.v = v;
        this.pitch = pitch;
        this.amp = '';
        this.len = (v_name === '' || c_name === '') ? 0.8 : 1;
        this.c_name = c_name;
        this.v_name = v_name;
        this.disp = Mola.kana[c_name + v_name] ?? c_name + v_name;
    }
    is_voiceless() {
        switch (this.c_name.substring(0, 1)) {
        case 'k': case 's': case 't': case 'c':
        case 'h': case 'p':
            return true;
        default:
            return false;
        }
    }
    is_stp_frc() {
        switch (this.c_name.substring(0, 1)) {
        case 'k': case 'g': case 's': case 'z': case 'j':
        case 't': case 'c': case 'd': case 'h': case 'f':
        case 'b': case 'p':
            return true;
        default:
            return false;
        }
    }
    set_vowel_voiceless(next) {
        if (this.is_voiceless()) {
            if (this.v_name === 'i') {
                if (next === null) {
                    this.v += '3';
                } else if (next.is_voiceless()) {
                    this.v += '4';
                }
            } else if (this.v_name === 'u') {
                if (next === null) {
                    this.v += '3';
                } else if (next.is_voiceless()) {
                    this.v += '4';
                }
            }
        }
    }
    toString() {
        let s = this.disp + '|';
        if (this.len !== 1) s += '=' + this.len;
        if (this.c !== '') {
            s += ' ' + this.c;
        }
        if (this.v !== '') {
            s += ' ' + this.v;
        }
        s += ' 7 ! 5 p';
        if (this.pitch < 10) s += this.pitch;
        if (this.amp !== '') s += ' ' + this.amp;
        return s;
    }
}

export class ToSound
{
    constructor(prm) {
        this.voiced = prm.voiced !== undefined ? 'v' + ((this.voiced * 10) | 0) : 'v';
        this.voiceless = prm.voiceless;
        this.reduce_pitch = prm.reduce_pitch;

        const v = this.voiced;
        this.consonant = {
            k: 'o2v0c +40 v0 +10',
            ky: 'eo2v0c +40 v0 +10',
            kw: 'o2L5v0c +40 v0 +10',
            g: 'o2' + v + 'c +30',
            gy: 'ef0' + v + 'c +20',
            gw: 'f0L5' + v + 'c +20',
            G: 'o4' + v + 'c7 +20 c7 +30',
            Gy: 'ef0' + v + 'c7 +20 c7 +20',
            'g~': 'o6n' + v + ' +60',
            'g~y': 'eo6n' + v + ' +60',
            s: 'Fv0c5s +40 ! +30',
            sh: 'Fv0c5s +20 fv0c5s +60',
            z: 'F' + v + 'c4s +40 c4s +10',
            j: 'F' + v + 'c3s +20 f' + v + 'c3s +60',
            t: 'Fv0c +40 v0 +20',
            ts: 'Fv0c +10 c5 +40 c5 +10 v0 +10',
            ch: 'Fv0cs +20 fv0c3s +40 v0 +10',
            d: 'F' + v + 'c +40',
            n: 'Fn' + v + ' +60',
            ny: 'fn' + v + ' +30',
            p: 'Lv0c +40 v0 +20',
            py: 'fLv0c +40 fc0v0 +20',
            h: 'v0 +50 v0 +20',
            b: 'L' + v + 'c +40',
            by: 'fL' + v + 'c +40',
            v: 'L' + v + 'c8 +20 c8 +30',
            vy: 'fL' + v + 'c8 +20 c8 +30',
            hy: 'fv0c7 +20 v0c7 +40',
            f: 'Lv0c5 +30 c5 +10 v0 +10',
            m: 'Ln' + v + ' +20 ! +40',
            my: 'fLn' + v + ' +30',
            y: 'f' + v + ' +70',
            r: 'F' + v + 'c4 +10 c0 +60',
            ry: 'Fe' + v + 'c4 +20',
            w: 'L' + v + ' +50',
            q: 'g +40 g +30',
        };
        this.vwl_to_cns = {
            k: 'L',
            ky: 'L',
            kw: 'L',
            g: 'L',
            gy: 'L',
            gw: 'L',
            'g~': 'L',
            'g~y': 'L',
            p: 'f',
            h: 'foL',
            b: 'f',
            f: 'f',
            m: 'f',
            r: 'L',
            w: 'f',
        };
        this.vowel = {
            a: (prm.a ?? 'f5o9') + v,
            i: (prm.i ?? 'f') + v,
            u: (prm.u ?? 'f3L3') + v,
            e: (prm.e ?? 'fo5') + v,
            o: (prm.o ?? 'o5L7') + v,
        };
        for (const k of 'aiueo') {
            const vwl = this.vowel[k];
            this.vowel['y' + k] = k === 'i' ? vwl : 'f' + ToSound.get_v(vwl, 'L') + v + ' +20 ' + vwl;
            this.vowel['w' + k] = ToSound.get_v(vwl, 'f') + 'L' + v + ' +20 ' + vwl;
        }
    }

    static get_v(s, k) {
        const i = s.indexOf(k);
        if (i >= 0) {
            let j = i + 1;
            while (j < s.length) {
                const c = s.charCodeAt(j);
                if (c < 0x30 || c > 0x39) break;
                j++;
            }
            return s.substring(i, j);
        }
        if (k === 'f') return 'f0';
        return '';
    }

    conv(src) {
        const v = this.voiced;
        const ret = [];
        let prev_q = false;
        let prev_mola = null;
        let edge = 0;

        for (const m of src.matchAll(/'| |(ky|kw|k|gy|gw|g~y|g~|g|sh|s|j|z|ts|t|ch|d|ny|n|hy|h|f|by|b|py|p|my|m|y|ry|r|w|q)?([aiueo])?/gi)) {
            if (m[0] === ' ') {
                if (prev_mola !== null) {
                    if (this.voiceless) {
                        prev_mola.set_vowel_voiceless(null);
                    }
                    if (this.reduce_pitch && prev_mola.pitch > 0) {
                        for (let i = edge; i < ret.length && ret[i].pitch === 10; i++) {
                            ret[i].pitch = 6;
                        }
                    }
                    if (prev_mola.amp === '') prev_mola.amp = '7 A8';
                    prev_mola = null;
                    prev_q = false;
                }
                ret.push('|.');
            }
            const cns = m[1] || '';
            const vwl = m[2] || '';
            if (cns === '' && vwl === '') continue;

            const vwl_l = vwl.toLowerCase();
            let cns_l = cns.toLowerCase();
            const pitch = (vwl !== vwl_l || cns !== cns_l) ? 10 : 0;

            let consonant = this.consonant[cns_l] || '';
            let vowel = this.vowel[vwl_l] || '';

            if (cns_l !== '' && vwl_l === 'i') {
                // palatalization
                if ('kg~nhpbmr'.indexOf(cns_l) >= 0) {
                    if (prev_mola && prev_mola.v !== '') {
                        switch (cns_l) {
                        case 'g':
                            cns_l = 'Gy';
                            break;
                        case 'b':
                            cns_l = 'vy';
                            break;
                        default:
                            cns_l += 'y';
                            break;
                        }
                    } else {
                        cns_l += 'y';
                    }
                    consonant = this.consonant[cns_l] || '';
                }
            } else if (prev_mola && prev_mola.v !== '') {
                switch (cns_l) {
                case 'g':
                    cns_l = 'G';
                    break;
                case 'gy':
                    cns_l = 'Gy';
                    break;
                case 'b':
                    cns_l = 'v';
                    break;
                case 'by':
                    cns_l = 'vy';
                    break;
                }
                consonant = this.consonant[cns_l] || '';
            }
            if (cns_l.length >= 2 && vwl_l.length >= 1) {
                if (cns_l.endsWith('y')) {
                    vowel = this.vowel['y' + vwl_l];
                } else if (cns_l.endsWith('w')) {
                    vowel = this.vowel['w' + vwl_l];
                }
            }
            if (cns_l in this.vwl_to_cns) {
                const vw = vwl_l !== '' ? this.vowel[vwl_l] : 'f0';
                let c2 = '';
                for (const k of this.vwl_to_cns[cns_l]) {
                    c2 += ToSound.get_v(vw, k);
                }
                consonant = c2 + consonant;
            }
            if (cns_l === 'q' && vwl_l === '') {
                consonant = 'g 8 g';
            }

            const mola = new Mola(consonant, vowel, cns.toLowerCase(), vwl.toLowerCase(), pitch);

            if (pitch === 10 && (!prev_mola || prev_mola.pitch === 0)) {
                edge = ret.length;
            }

            if (prev_mola && prev_mola.c_name === 'n' && prev_mola.v_name === '') {
                // 「ん」の異音
                switch (cns_l) {
                case '':
                    // 鼻母音
                    prev_mola.c = mola.v + 'n6';
                    break;
                case 'k': case 'g': case 'g~': case 'G':
                case 'ky': case 'gy': case 'g~y': case 'Gy':
                    prev_mola.c = 'f0n' + v;
                    break;
                case 't': case 'd': case 'n':
                case 'ch': case 'j': case 'ny':
                case 's': case 'z': case 'sh':
                    prev_mola.c = 'Fn' + v;
                    break;
                case 'p': case 'b': case 'v': case 'm':
                case 'py': case 'by': case 'vy': case 'my': case 'w':
                    prev_mola.c = 'f0Ln' + v;
                    break;
                case 'y':
                    prev_mola.c = 'fn' + v;
                    break;
                }
            }
            if (prev_q) {
                if (mola.is_stp_frc()) {
                    prev_mola.disp = 'ッ';
                }
            }
            prev_q = (mola.v_name === '' && mola.is_stp_frc());

            if (prev_mola && this.voiceless) {
                prev_mola.set_vowel_voiceless(mola);
            }
            if (!prev_mola) {
                mola.amp = '0 +10 A 7 A8';
            }
            ret.push(mola);
            prev_mola = mola;
        }
        if (prev_mola) {
            if (this.voiceless) {
                prev_mola.set_vowel_voiceless(null);
            }
            if (prev_mola.amp === '') prev_mola.amp = '7 A8';

            if (this.reduce_pitch && prev_mola.pitch > 0) {
                for (let i = edge; i < ret.length && ret[i].pitch === 10; i++) {
                    ret[i].pitch = 6;
                }
            }
        }
        return ret.map(m => m.toString());
    }
}
