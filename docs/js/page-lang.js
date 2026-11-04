const LANG_KEYS = ['en', 'ja', 'zh', 'zh-hant'];

const LANG_MAP = {
    'en': {
        name:'English',
        not_tr:'This document has not been translated.',
    },
    'ja': {
        name:'日本語',
        not_tr:'この文書は翻訳されていません。',
    },
    'zh': {
        name:'简体中文',
        not_tr:'本文档尚未翻译。',
    },
    'zh-hant': {
        name:'繁體中文',
        not_tr:'本文檔尚未翻譯。',
    },
};

/**
 * 
 * @param {string[]} locales 
 * @returns {string}
 */
function get_default_lang()
{
    const zh_hant = ['zh-hant', 'zh-tw', 'zh-hk', 'zh-mo'];
    const locales = window.location.hash !== '' ? [window.location.hash.substring(1)] : window.navigator.languages

    for (const ln of locales) {
        const k = ln.toLowerCase();
        if (zh_hant.indexOf(k) >= 0) {
            return 'zh-hant';
        }
        const s = k.split('-')[0];
        if (LANG_KEYS.indexOf(s)) {
            return s;
        }
    }
    return 'en';
}
/**
 * 
 * @param {string} lang
 * @param {HTMLSelectElement} elem 
 */
function init_language_select(lang, elem)
{
    for (const tag of LANG_KEYS) {
        const option = document.createElement('option');
        option.setAttribute('value', tag);
        option.textContent = `${LANG_MAP[tag].name} (${tag})`;
        elem.appendChild(option);
    }
    elem.value = lang;
}

/**
 * 
 * @param {string} lang 
 * @param {HTMLElement} node 
 */
function update_language(lang, node, def_lang)
{
    for (const elem of node.childNodes) {
        if (elem instanceof Element) {
            const res = elem.dataset[lang];
            if (res !== undefined) {
                update_content(elem, res, def_lang);
            } else {
                update_language(lang, elem, def_lang);
            }
            if (elem.tagName === 'A') {
                const href = elem.getAttribute('href');
                if (href && href.startsWith('./')) {
                    elem.setAttribute('href', href.replace(/#.*$/, '') + window.location.hash);
                }
            }
        }
    }
}
/**
 * 
 * @param {HTMLElement} elem 
 * @param {string} text 
 * @param {string} def_lang
 */
function update_content(elem, text, def_lang)
{
    if (!elem.dataset[def_lang]) {
        elem.dataset[def_lang] = serialize(elem);
    }
    elem.textContent = '';
    for (const n of parse_text(text)) {
        elem.appendChild(n);
    }
}
function *parse_text(src)
{
    let begin = 0;
    let tag = '';
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (tag === '*') {
            if (ch === '*') {
                if (begin < i) {
                    const b = document.createElement('b');
                    b.textContent = src.substring(begin, i);
                    yield b;
                }
                begin = i + 1;
                tag = '';
            }
        } else if (tag === '`') {
            if (ch === '`') {
                if (begin < i) {
                    const span = document.createElement('span');
                    span.classList.add('code');
                    span.textContent = src.substring(begin, i);
                    yield span;
                }
                begin = i + 1;
                tag = '';
            }
        } else {
            if (ch === '*' || ch === '`') {
                if (begin < i) {
                    yield document.createTextNode(src.substring(begin, i));
                }
                begin = i + 1;
                tag = ch;
            }
        }
    }
    if (tag === '') {
        if (begin < src.length) {
            yield document.createTextNode(src.substring(begin));
        }
    }
}
function serialize(elem)
{
    const ret = [];
    for (const n of elem.childNodes) {
        const tag = n instanceof HTMLElement ? n.tagName : '';
        if (tag === 'B') {
            ret.push('*');
            ret.push(n.textContent);
            ret.push('*');
        } else if (tag === 'SPAN') {
            ret.push('`');
            ret.push(n.textContent);
            ret.push('`');
        } else {
            ret.push(n.textContent);
        }
    }
    return ret.join('');
}

function create_not_translated_msg(lang)
{
    const div = document.createElement('div');
    div.classList.add('not-translated');
    div.textContent = LANG_MAP[lang].not_tr;
    div.setAttribute('lang', lang);
    return div;
}

document.addEventListener('DOMContentLoaded', () => {
    let lang = get_default_lang();
    const select = document.getElementById('language');
    init_language_select(lang, select);
    const lang_list = select.dataset.list.split(',');
    let not_translated_msg = null;

    function update() {
        const not_translated = lang_list.indexOf(lang) < 0;
        const alt_lang = not_translated ? lang_list[0] : lang;
        if (not_translated_msg !== null) {
            not_translated_msg.remove();
        }
        if (not_translated) {
            const language_select = document.getElementById('language-select');
            not_translated_msg = create_not_translated_msg(lang);
            language_select.parentNode.insertBefore(not_translated_msg, language_select.nextSibling);
        }
        document.body.setAttribute('lang', alt_lang);
        update_language(alt_lang === 'zh-hant' ? 'zht' : alt_lang, document.body, lang_list[0]);
    }

    window.addEventListener('hashchange', () => {
        lang = lang = get_default_lang();
        select.value = lang;
        update();
    });
    select.addEventListener('change', () => {
        lang = select.value;
        window.location.hash = `#${lang}`;
        update();
    });
    update();
});
