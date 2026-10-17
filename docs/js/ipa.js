import { SAMPLING_RATE, VoiceSynth } from '../lib/vsynth.js';
import { WavPlayer } from './player.js';
import { show_spectrum } from './spectrum.js';


const resources = {
    ar: {
        title: 'جداول الأبجدية الصوتية الدولية مع الصوت',
        ipa: [0, 'ألفبائية صوتية دولية'],
        pfn: [0, 'تدوين السمات الصوتية'],
        name: [0, 'اسم'],
        consonant: null,

        v:  [3, 'مجهور'],
        vl: [3, 'مهموس'],

        blb: [1, 'شفوي'],
        lbd: [1, 'أسناني شفوي'],
        dnt: [1, 'أسناني'],
        alv: [1, 'لثوي'],
        pla: [1, 'لثوي غاري'],
        rfx: [1, 'ارتدادي'],
        pal: [1, 'غاري'],
        vel: [1, 'طبقي'],
        uvl: [1, 'لهوي'],
        glt: [1, 'حنجري'],

        stp: [2, 'وقفي'],
        frc: [2, 'احتكاكي'],
        sib: [2, 'صفير'],
        afr: [2, 'المزجي'],
        nas: [2, 'أنفي'],
        apr: [2, 'متقارب'],
        flp: [2, 'متقارب'],
        trl: [2, 'تكراري'],
        lap: [2, 'جانبي متقارب'],
        lfr: [2, 'جانبي احتكاكي'],
        laf: [2, 'جانبي المزجي'],
        lfl: [2, 'جانبي مستل'],

        unr: [3, 'غير مدور'],
        rnd: [3, 'مدور'],
        rzd: [4, 'رائي'],
        nzd: [5, 'مؤنف'],
        vowel: [0, 'صائت'],

        f0: [1, 'خلفي'],
        f2: [1, 'شبه خلفي'],
        f5: [1, 'مركزي'],
        f8: [1, 'شبه أمامي'],
        f:  [1, 'أمامي'],
        o0: [2, 'مغلق'],
        o2: [2, 'شبه مغلق'],
        o4: [2, 'متوسط مغلق'],
        o5: [2, 'متوسط'],
        o6: [2, 'متوسط مفتوح'],
        o8: [2, 'شبه مفتوح'],
        o:  [2, 'مفتوح'],
    },
    en: {
        title: 'IPA Charts with Audio',
        ipa: [0, 'International Phonetic Alphabet'],
        pfn: [0, 'Phonetic Feature Notation'],
        name: [0, 'name'],
        consonant: null,

        v:  [0, 'voiced'],
        vl: [0, 'voiceless'],

        blb: [1, 'bilabial'],
        lbd: [1, 'labiodental'],
        dnt: [1, 'dental'],
        alv: [1, 'alveolar'],
        pla: [1, 'postalveolar'],
        rfx: [1, 'retroflex'],
        pal: [1, 'palatal'],
        vel: [1, 'velar'],
        uvl: [1, 'uvular'],
        glt: [1, 'glottal'],

        stp: [2, 'plosive', 'plosives'],
        frc: [2, 'fricative', 'fricatives'],
        sib: [2, 'sibilant fricative', 'sibilant fricatives'],
        afr: [2, 'affricate', 'affricates'],
        nas: [2, 'nasal', 'nasals'],
        apr: [2, 'approximant', 'approximants'],
        flp: [2, 'flap', 'flaps'],
        trl: [2, 'trill', 'trills'],
        lap: [2, 'lateral approximant', 'lateral approximants'],
        lfr: [2, 'lateral fricative', 'lateral fricatives'],
        laf: [2, 'lateral affricate', 'lateral affricates'],
        lfl: [2, 'lateral flap', 'lateral flaps'],

        unr: [3, 'unrounded'],
        rnd: [3, 'rounded'],
        rzd: [4, 'rhotic'],
        nzd: [5, 'nasalized'],
        vowel: [6, 'vowel'],

        f0: [2, 'back'],
        f2: [2, 'near back'],
        f5: [2, 'central'],
        f8: [2, 'near front'],
        f:  [2, 'front'],
        o0: [1, 'close'],
        o2: [1, 'near close'],
        o4: [1, 'close mid'],
        o5: [1, 'mid'],
        o6: [1, 'open mid'],
        o8: [1, 'near open'],
        o:  [1, 'open'],
    },
    es: {
        title: 'Tablas del AFI con audio',
        ipa: [0, 'Alfabeto Fonético Internacional'],
        pfn: [0, 'Notación de rasgos fonéticos'],
        name: [0, 'nombre'],
        consonant: null,

        v:  [3, 'sonora'],
        vl: [3, 'sorda'],

        blb: [2, 'bilabial'],
        lbd: [2, 'labiodental'],
        dnt: [2, 'dental'],
        alv: [2, 'alveolar'],
        pla: [2, 'palatoalveolar'],
        rfx: [2, 'retrofleja'],
        pal: [2, 'palatal'],
        vel: [2, 'velar'],
        uvl: [2, 'uvular'],
        glt: [2, 'glotal'],

        stp: [1, 'oclusiva'],
        frc: [1, 'fricativa'],
        sib: [1, 'fricativa sibilante'],
        afr: [1, 'africada'],
        nas: [1, 'nasal'],
        apr: [1, 'aproximante'],
        flp: [1, 'vibrante simple'],
        trl: [1, 'vibrante múltiple'],
        lap: [1, 'aproximante lateral'],
        lfr: [1, 'fricativa lateral'],
        laf: [1, 'africada lateral'],
        lfl: [1, 'vibrante simple lateral'],

        unr: [3, 'no redondeada'],
        rnd: [3, 'redondeada'],
        rzd: [4, 'rotización'],
        nzd: [5, 'nasalizada'],
        vowel: [0, 'vocal'],

        f0: [2, 'posterior'],
        f2: [2, 'semiposterior'],
        f5: [2, 'central'],
        f8: [2, 'semianterior'],
        f:  [2, 'anterior'],
        o0: [1, 'cerrada'],
        o2: [1, 'casi cerrada'],
        o4: [1, 'semicerrada'],
        o5: [1, 'media'],
        o6: [1, 'semiabierta'],
        o8: [1, 'casi abierta'],
        o:  [1, 'abierta'],
    },
    fr: {
        title: 'Tableaux de l’API avec audio',
        ipa: [0, 'alphabet phonétique international'],
        pfn: [0, 'Notation des traits phonétiques'],
        name: [0, 'nom'],
        consonant: [0, 'consonne'],

        v:  [4, 'voisée'],
        vl: [4, 'sourde'],

        blb: [2, 'bilabiale'],
        lbd: [2, 'labio-dentale'],
        dnt: [2, 'dentale'],
        alv: [2, 'alvéolaire'],
        pla: [2, 'palato-alvéolaire'],
        rfx: [2, 'rétroflexe'],
        pal: [2, 'palatale'],
        vel: [2, 'vélaire'],
        uvl: [2, 'uvulaire'],
        glt: [2, 'glottale'],

        stp: [1, 'occlusive', 'occlusives'],
        frc: [1, 'fricative', 'fricatives'],
        sib: [1, 'sibilante', 'sibilantes'],
        afr: [1, 'affriquée', 'affriquées'],
        nas: [1, 'nasale', 'nasales'],
        apr: [1, 'spirante', 'spirantes'],
        flp: [1, 'battue', 'battues'],
        trl: [1, 'roulée', 'roulées'],
        lap: [1, 'latérale spirante', 'latérale spirantes'],
        lfr: [1, 'latérale fricative', 'latérale fricatives'],
        laf: [1, 'latérale affriquée', 'latérale affriquées'],
        lfl: [1, 'latérale battue', 'latérale battues'],

        unr: [3, 'non arrondie'],
        rnd: [3, 'arrondie'],
        rzd: [4, 'rhotique'],
        nzd: [5, 'nasalisé'],
        vowel: [0, 'voyelles'],

        f0: [2, 'postérieure'],
        f2: [2, 'mi-postérieure'],
        f5: [2, 'centrale'],
        f8: [2, 'mi-antérieure'],
        f:  [2, 'antérieure'],
        o0: [1, 'fermée'],
        o2: [1, 'pré-fermées'],
        o4: [1, 'mi-fermées'],
        o5: [1, 'moyenne'],
        o6: [1, 'mi-ouverte'],
        o8: [1, 'pré-ouvertes'],
        o:  [1, 'ouvertes'],
    },
    ja: {
        title: '音声付きIPA一覧表',
        ipa: [0, '国際音声記号'],
        pfn: [0, '弁別素性表記'],
        name: [0, '名称'],
        consonant: [3, '音'],

        v:  [0, '有声'],
        vl: [0, '無声'],

        blb: [1, '両唇'],
        lbd: [1, '唇歯'],
        dnt: [1, '歯'],
        alv: [1, '歯茎'],
        pla: [1, '後部歯茎'],
        rfx: [1, 'そり舌'],
        pal: [1, '硬口蓋'],
        vel: [1, '軟口蓋'],
        uvl: [1, '口蓋垂'],
        glt: [1, '声門'],

        stp: [2, '破裂'],
        frc: [2, '摩擦'],
        afr: [2, '破擦'],
        sib: [2, '歯擦'],
        nas: [2, '鼻'],
        apr: [2, '接近'],
        flp: [2, 'はじき'],
        trl: [2, 'ふるえ'],
        lap: [2, '側面接近'],
        lfr: [2, '側面摩擦'],
        laf: [2, '側面破擦'],
        lfl: [2, '側面はじき'],

        unr: [0, '非円唇'],
        rnd: [0, '円唇'],
        rzd: [5, 'そり舌'],
        nzd: [6, '鼻音化'],
        vowel: [7, '母音'],

        f0: [1, '後舌'],
        f2: [1, '準後舌'],
        f5: [1, '中舌'],
        f8: [1, '準前舌'],
        f:  [1, '前舌'],
        o0: [2, '狭'],
        o2: [2, '広めの狭'],
        o4: [2, '半狭'],
        o5: [2, '中央'],
        o6: [2, '半広'],
        o8: [2, '狭めの広'],
        o:  [2, '広'],
    },
    ko: {
        title: '음성 포함 IPA 목록표',
        ipa: [0, '국제 음성 기호'],
        pfn: [0, '음성적 자질 표기'],
        name: [0, '이름'],
        consonant: null,

        v:  [0, '유성'],
        vl: [0, '무성'],

        blb: [1, '양순'],
        lbd: [1, '순치'],
        dnt: [1, '치'],
        alv: [1, '치경'],
        pla: [1, '후치경'],
        rfx: [1, '권설'],
        pal: [1, '경구개'],
        vel: [1, '연구개'],
        uvl: [1, '구개수'],
        glt: [1, '성문'],

        stp: [2, '파열음'],
        frc: [2, '마찰음'],
        afr: [2, '파찰음'],
        sib: [2, '치찰'],
        nas: [2, '비음'],
        apr: [2, '접근음'],
        flp: [2, '탄음'],
        trl: [2, '전동음'],
        lap: [2, '설측 접근음'],
        lfr: [2, '설측 마찰음'],
        laf: [2, '설측 파찰음'],
        lfl: [2, '설측 탄음'],

        unr: [1, '비원순'],
        rnd: [1, '원순'],
        rzd: [5, 'R-착색된'],
        nzd: [6, '비음화'],
        vowel: null,

        f0: [0, '후설'],
        f2: [0, '근후설'],
        f5: [0, '중설'],
        f8: [0, '근전설'],
        f:  [0, '전설'],
        o0: [2, '고모음'],
        o2: [2, '근고모음'],
        o4: [2, '중고모음'],
        o5: [2, '중모음'],
        o6: [2, '중저모음'],
        o8: [2, '근저모음'],
        o:  [2, '저모음'],
    },
    ru: {
        title: 'Таблицы МФА с аудио',
        ipa: [0, 'международный фонетический алфавит'],
        pfn: [0, 'Обозначение фонетических признаков'],
        name: [0, 'имя'],
        consonant: null,

        v: [0, 'звонкий'],
        vl: [0, 'глухой'],

        blb: [1, 'губно-губной', 'губно-губные'],
        lbd: [1, 'губно-зубной', 'губно-зубные'],
        dnt: [1, 'зубной', 'зубные'],
        alv: [1, 'альвеолярный', 'альвеолярные'],
        pla: [1, 'постальвеолярный', 'палато-альвеолярные'],
        rfx: [1, 'ретрофлексный', 'ретрофлексные'],
        pal: [1, 'палатальный', 'палатальные'],
        vel: [1, 'велярный', 'велярные'],
        uvl: [1, 'увулярный', 'увулярные'],
        glt: [1, 'гортанная', 'глоттальные'],

        stp: [2, 'взрывной согласный', 'взрывные'],
        frc: [2, 'фрикатив согласный', 'фрикативы'],
        sib: [2, 'сибилянт', 'сибилянты'],
        afr: [2, 'аффриката', 'аффрикаты'],
        nas: [2, 'носовой согласный', 'носовые'],
        apr: [2, 'аппроксимант', 'аппроксиманты'],
        flp: [2, 'одноударный согласный', 'одноударные'],
        trl: [2, 'дрожащие согласные', 'дрожащие'],
        lap: [2, 'латеральный аппроксимант', 'латеральные аппроксиманты'],
        lfr: [2, 'латеральный спирант', 'латеральные фрикативы'],
        laf: [2, 'латеральный аффриката', 'латеральные аффрикаты'],
        lfl: [2, 'латеральный одноударный согласный', 'латеральные одноударные'],

        unr: [3, 'неогублённый гласный'],
        rnd: [3, 'огублённый гласный'],
        rzd: [4, 'эризованный'],
        nzd: [5, 'нисходяще-восходящий'],
        vowel: null,

        f0: [1, 'заднего ряда'],
        f2: [1, 'ненапряжённые задние'],
        f5: [1, 'среднего ряда'],
        f8: [1, 'ненапряжённые передние'],
        f:  [1, 'переднего ряда'],
        o0: [2, 'верхнего подъёма'],
        o2: [2, 'верхнего подъёма', 'ненапряжённые верхние'],
        o4: [2, 'средне-верхнего подъёма', 'средне‐верхние'],
        o5: [2, 'среднего подъёма'],
        o6: [2, 'средне-нижнего подъёма', 'средне‐нижние'],
        o8: [2, 'нижнего подъёма', 'ненапряжённые нижние'],
        o:  [2, 'нижнего подъёма'],
    },
    zh: {
        title: '带音频的国际音标表',
        ipa: [0, '国际音标'],
        pfn: [0, '语音特徵记谱'],
        name: [0, '名称'],
        consonant: [3, '音'],

        v:  [1, '浊'],
        vl: [1, '清'],

        blb: [0, '双唇'],
        lbd: [0, '唇齿'],
        dnt: [0, '齿'],
        alv: [0, '龈'],
        pla: [0, '龈后'],
        rfx: [0, '卷舌'],
        pal: [0, '硬腭'],
        vel: [0, '软腭'],
        uvl: [0, '小舌'],
        glt: [0, '声门'],

        stp: [2, '爆发'],
        frc: [2, '擦'],
        afr: [2, '塞擦'],
        sib: [2, '咝擦'],
        nas: [2, '鼻'],
        apr: [2, '近'],
        flp: [2, '闪'],
        trl: [2, '颤'],
        lap: [2, '边近'],
        lfr: [2, '边擦'],
        laf: [2, '边塞擦'],
        lfl: [2, '边闪'],

        unr: [3, '不圆唇'],
        rnd: [3, '圆唇'],
        rzd: [5, '儿化'],
        nzd: [6, '鼻音化'],
        vowel: [7, '元音'],

        f0: [2, '后'],
        f2: [2, '次后'],
        f5: [2, '央'],
        f8: [2, '次前'],
        f:  [2, '前'],
        o0: [1, '闭'],
        o2: [1, '次闭'],
        o4: [1, '半闭'],
        o5: [1, '中'],
        o6: [1, '半开'],
        o8: [1, '次开'],
        o:  [1, '开'],
    },
    'zh-Hant': {
        title: '附音訊的IPA音標圖表',
        ipa: [0, '國際音標'],
        pfn: [0, '語音特徵記譜'],
        name: [0, '名稱'],
        consonant: [3, '音'],

        v:  [1, '濁'],
        vl: [1, '清'],

        blb: [0, '雙唇'],
        lbd: [0, '唇齒'],
        dnt: [0, '齒'],
        alv: [0, '齦'],
        pla: [0, '齦後'],
        rfx: [0, '捲舌'],
        pal: [0, '硬腭'],
        vel: [0, '軟腭'],
        uvl: [0, '小舌'],
        glt: [0, '聲門'],

        stp: [2, '爆發'],
        frc: [2, '擦'],
        afr: [2, '塞擦'],
        sib: [2, '咝擦'],
        nas: [2, '鼻'],
        apr: [2, '近'],
        flp: [2, '閃'],
        trl: [2, '颤'],
        lap: [2, '邊近'],
        lfr: [2, '邊擦'],
        laf: [2, '邊塞擦'],
        lfl: [2, '邊閃'],

        unr: [3, '不圓唇'],
        rnd: [3, '圓唇'],
        rzd: [5, '兒化'],
        nzd: [6, '鼻音化'],
        vowel: [7, '母音'],

        f0: [2, '後'],
        f2: [2, '次後'],
        f5: [2, '央'],
        f8: [2, '次前'],
        f:  [2, '前'],
        o0: [1, '閉'],
        o2: [1, '次閉'],
        o4: [1, '半閉'],
        o5: [1, '中'],
        o6: [1, '半開'],
        o8: [1, '次開'],
        o:  [1, '開'],
    },
};
const option = {
    ar: {
        dir: 'rtl',
        separator: ' ',
        capitalize: false,
    },
    en: {
        dir: 'ltr',
        separator: ' ',
        capitalize: true,
    },
    es: {
        dir: 'ltr',
        separator: ' ',
        capitalize: true,
    },
    fr: {
        dir: 'ltr',
        separator: ' ',
        capitalize: true,
    },
    ja:  {
        dir: 'ltr',
        separator: '',
        capitalize: false,
    },
    ko:  {
        dir: 'ltr',
        separator: ' ',
        capitalize: false,
    },
    ru: {
        dir: 'ltr',
        separator: ' ',
        capitalize: true,
    },
    zh:  {
        dir: 'ltr',
        separator: '',
        capitalize: false,
    },
    'zh-Hant':  {
        dir: 'ltr',
        separator: '',
        capitalize: false,
    },
};

function capitalize(s)
{
    return s.substring(0, 1).toUpperCase() + s.substring(1);
}
function array_to_name(ret, opt)
{
    ret.sort((a, b) => a[0] - b[0]);
    const s = ret.map(a => a[1]).join(opt.separator);
    return opt.capitalize ? capitalize(s) : s;
}

function get_c_name(k, lang)
{
    const d = resources[lang];
    const ret = [];
    for (const s of k.split('-')) {
        ret.push(d[s]);
    }
    if (d.consonant !== null) ret.push(d.consonant);
    return array_to_name(ret, option[lang]);
}

function update_c_info(elem, pfn, lang)
{
    const k = elem.dataset.smp;
    document.getElementById('name').textContent = get_c_name(k, lang);
    document.getElementById('ipa').textContent = elem.textContent;
    document.getElementById('xsampa').textContent = elem.dataset.xsampa ?? elem.textContent;

    if (!pfn) return null;

    document.getElementById('pfn').textContent = pfn;

    const m = pfn.match(/r\d?/);
    const vowel = m ? `f5o9v${m[0]} 6 f5o9v` : 'f5o9v';

    const synth = new VoiceSynth(VoiceSynth.default_voice());
    const src_list = [
        `${pfn} ${vowel} 2 p 8 p0 0 +10 A 9 A`,
        '=0.75 .',
        '=0.75 f5o9v 6 ! 9 p0 0 +10 A',
        `${pfn} ${vowel} 0 p 2 p 8 p0 9 A`,
        '=0.25 .',
    ];
    synth.set_pfn(src_list, 180, 4800, 600, 1.0);
    const buf = new Float32Array(synth.get_remaining());
    synth.generate(buf);
    return buf;
}

function get_v_name(pfn, lang)
{
    const d = resources[lang];
    const ret = [];

    const m1 = pfn.match(/o\d?/);
    const s1 = m1 ? m1[0] : 'o0';
    ret.push(d[s1]);
    const m2 = pfn.match(/f\d?/);
    const s2 = m2 ? m2[0] : 'f0';
    ret.push(d[s2]);
    const s3 = pfn.indexOf('L') >= 0 ? 'rnd' : 'unr';
    ret.push(d[s3]);
    if (d.vowel !== null) ret.push(d.vowel);

    return array_to_name(ret, option[lang]);
}
function update_v_info(elem, pfn, rhotic, nasalize, lang)
{
    if (rhotic) pfn += 'r7';
    if (nasalize) pfn += 'n5';
    let xsampa = elem.dataset.xsampa ?? elem.textContent.replaceAll(/[\u02DE\u0303]/g, '');
    if (rhotic) xsampa += '`';
    if (nasalize) xsampa += '~';

    document.getElementById('name').textContent = get_v_name(pfn, lang);
    document.getElementById('ipa').textContent = elem.textContent;
    document.getElementById('xsampa').textContent = xsampa;
    document.getElementById('pfn').textContent = pfn;

    const synth = new VoiceSynth(VoiceSynth.default_voice());
    const src_list = [
        `${pfn} 5 ! 2 p 8 p0 0 +10 A 9 A`,
        '=0.25 .',
    ];
    synth.set_pfn(src_list, 180, 4800, 600, 1.0);
    const buf = new Float32Array(synth.get_remaining());
    synth.generate(buf);
    return buf;
}
function toggle_vowel_opt(opt)
{
    for (const td of document.getElementById('vowel-table').getElementsByClassName('ipa')) {
        let s = td.textContent.replaceAll(/[\u02DE\u0303]/g, '');
        td.textContent = s + opt;
    }
}
function update_text_main(node, res, opt)
{
    for (const elem of node.childNodes) {
        if (elem instanceof Element) {
            const k = elem.dataset.res;
            if (k in res) {
                const s = res[k].at(-1);
                elem.textContent = opt.capitalize ? capitalize(s) : s;
            } else {
                update_text_main(elem, res, opt);
            }
        }
    }
}
function update_text(lang)
{
    const res = resources[lang];
    const opt = option[lang];
    document.title = res.title;
    document.body.setAttribute('lang', lang);
    document.body.setAttribute('dir', opt.dir);
    update_text_main(document.body, res, opt);
}
function get_default_lang()
{
    const list = [
        'ar', 'en', 'es', 'fr', 'ja', 'ko', 'ru', 'zh',
    ];
    const zh_hant = [
        'zh-tw', 'zh-hk', 'zh-mo'
    ];
    for (const ln of window.navigator.languages) {
        const k = ln.toLowerCase();
        if (zh_hant.indexOf(k) >= 0) {
            return 'zh-Hant';
        }
        const s = k.split('-')[0];
        if (list.indexOf(s) >= 0) {
            return s;
        }
    }
    return 'en';
}

document.addEventListener('DOMContentLoaded', () =>
{
    const spectrum = document.getElementById('spectrum');
    const play_btn = document.getElementById('play');
    const rhotic = document.getElementById('rhotic');
    const nasalize = document.getElementById('nasalize');
    const language = document.getElementById('language');
    const player = new WavPlayer(SAMPLING_RATE, 0.3, 0.9);
    let wavebuf = null;
    let selected_cell = null;

    language.value = get_default_lang();

    function select_cell(target, update_wave) {
        if (selected_cell !== target) {
            if (selected_cell) selected_cell.classList.remove('selected');
            selected_cell = target;
            selected_cell.classList.add('selected');
        }
        const pfn = selected_cell.dataset.pfn;
        if (!pfn) {
            wavebuf = null;
            return;
        }
        if (selected_cell.dataset.vowel) {
            wavebuf = update_v_info(selected_cell, pfn, rhotic.checked, nasalize.checked, language.value);
        } else {
            wavebuf = update_c_info(selected_cell, pfn, language.value);
        }
        if (update_wave) {
            if (wavebuf) {
                show_spectrum(spectrum, wavebuf);
            } else {
                spectrum.getContext('2d').clearRect(0, 0, spectrum.width, spectrum.height);
            }
            play_btn.disabled = !wavebuf;
        }
    }

    document.getElementById('flow').addEventListener('click', e => {
        const target = e.target;
        if (target.classList.contains('ipa')) {
            select_cell(target, true);
        }
    });
    language.addEventListener('change', () => {
        update_text(language.value);
        select_cell(selected_cell, false);
    })
    play_btn.addEventListener('click', e => {
        if (wavebuf) {
            const t = e.currentTarget;
            t.disabled = true;
            player.play(wavebuf).then(() => t.disabled = false);
        }
    });
    document.getElementById('vowel-opt').addEventListener('change', () => {
        let opt = '';
        if (nasalize.checked) opt += "\u0303";
        if (rhotic.checked) opt += "\u02DE";
        toggle_vowel_opt(opt);
        select_cell(selected_cell, true);
    });

    update_text(language.value);
    select_cell(document.getElementById('phone-def'), true);
});
