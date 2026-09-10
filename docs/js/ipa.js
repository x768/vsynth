import { SAMPLING_RATE, VoiceSynth } from '../lib/vsynth.js';
import { WavPlayer } from './player.js';
import { show_spectrum } from './spectrum.js';

function get_c_en_name(k)
{
    const ret = [];
    for (const s of k.split('-')) {
        switch (s) {
        case 'v':   ret.push('voiced'); break;
        case 'vl':  ret.push('voiceless'); break;

        case 'blb': ret.push('bilabial'); break;
        case 'lbd': ret.push('labiodental'); break;
        case 'dnt': ret.push('dental'); break;
        case 'alv': ret.push('alveolar'); break;
        case 'pla': ret.push('postalveolar'); break;
        case 'rfx': ret.push('retroflex'); break;
        case 'pal': ret.push('palatal'); break;
        case 'vel': ret.push('velar'); break;
        case 'uvl': ret.push('uvular'); break;
        case 'glt': ret.push('glottal'); break;

        case 'stp': ret.push('plosive'); break;
        case 'frc': ret.push('fricative'); break;
        case 'afr': ret.push('affricate'); break;
        case 'nas': ret.push('nasal'); break;
        case 'apr': ret.push('approximant'); break;
        case 'flp': ret.push('flap'); break;
        case 'trl': ret.push('trill'); break;
        case 'lap': ret.push('lateral approximant'); break;
        case 'lfr': ret.push('lateral fricative'); break;
        case 'laf': ret.push('lateral affricate'); break;
        case 'lfl': ret.push('lateral flap'); break;
        }
    }
    return ret.join(' ');
}
function get_c_ja_name(k)
{
    const ret = [];
    for (const s of k.split('-')) {
        switch (s) {
        case 'v':   ret.push('有声'); break;
        case 'vl':  ret.push('無声'); break;

        case 'blb': ret.push('両唇'); break;
        case 'lbd': ret.push('唇歯'); break;
        case 'dnt': ret.push('歯'); break;
        case 'alv': ret.push('歯茎'); break;
        case 'pla': ret.push('後部歯茎'); break;
        case 'rfx': ret.push('そり舌'); break;
        case 'pal': ret.push('硬口蓋'); break;
        case 'vel': ret.push('軟口蓋'); break;
        case 'uvl': ret.push('口蓋垂'); break;
        case 'glt': ret.push('声門'); break;

        case 'stp': ret.push('破裂音'); break;
        case 'frc': ret.push('摩擦音'); break;
        case 'afr': ret.push('破擦音'); break;
        case 'nas': ret.push('鼻音'); break;
        case 'apr': ret.push('接近音'); break;
        case 'flp': ret.push('はじき音'); break;
        case 'trl': ret.push('ふるえ音'); break;
        case 'lap': ret.push('側面接近音'); break;
        case 'lfr': ret.push('側面摩擦音'); break;
        case 'laf': ret.push('側面破擦音'); break;
        case 'lfl': ret.push('側面はじき音'); break;
        }
    }
    return ret.join('');
}

function update_c_info(elem, pfn)
{
    const k = elem.dataset.smp;
    const en = get_c_en_name(k);
    document.getElementById('en').textContent = en[0].toUpperCase() + en.substring(1);
    document.getElementById('ja').textContent = get_c_ja_name(k);
    document.getElementById('ipa').textContent = elem.textContent;
    document.getElementById('xsampa').textContent = elem.dataset.xsampa ?? elem.textContent;

    if (!pfn) return null;

    document.getElementById('pfn').textContent = pfn;

    let vowel = "f5o9v";
    const m = pfn.match(/r\d?/);
    if (m) {
        vowel = "f5o9v" + m[0] + " 6 f5o9v";
    }

    const synth = new VoiceSynth(VoiceSynth.default_voice());
    const src_list = [
        pfn + " " + vowel + " 2 p 8 p0 0 A0 +10 A 9 A ^ A0",
        "=0.75 .",
        "=0.75 f5o9v 6 ! 9 p0 0 A0 +10 A",
        pfn + " " + vowel + " 0 p 2 p 8 p0 9 A ^ A0",
        "=0.25 .",
    ];
    synth.set_pfn(src_list, 180, 4800, 600, 1.0);
    const buf = new Float32Array(synth.get_remaining());
    synth.generate(buf);
    return buf;
}

function get_v_en_name(pfn)
{
    const ret = [];

    const m1 = pfn.match(/o\d?/);
    switch (m1 ? m1[0] : 'o0') {
    case 'o0': ret.push('Close'); break;
    case 'o2': ret.push('Near close'); break;
    case 'o4': ret.push('Close mid'); break;
    case 'o5': ret.push('Mid'); break;
    case 'o6': ret.push('Open mid'); break;
    case 'o8': ret.push('Near open'); break;
    case 'o':  ret.push('Open'); break;
    }

    const m2 = pfn.match(/f\d?/);
    switch (m2 ? m2[0] : 'f0') {
    case 'f0': ret.push('back'); break;
    case 'f2': ret.push('near back'); break;
    case 'f5': ret.push('central'); break;
    case 'f8': ret.push('near front'); break;
    case 'f':  ret.push('front'); break;
    }

    ret.push(pfn.indexOf('L') >= 0.3 ? 'rounded' : 'unrounded');
    ret.push('vowel');
    return ret.join(' ');
}
function get_v_ja_name(pfn)
{
    const ret = [];

    ret.push(pfn.indexOf('L') >= 0.3 ? '円唇' : '非円唇');

    const m1 = pfn.match(/f\d?/);
    switch (m1 ? m1[0] : 'f0') {
    case 'f0': ret.push('後舌'); break;
    case 'f2': ret.push('準後舌'); break;
    case 'f5': ret.push('中舌'); break;
    case 'f8': ret.push('準前舌'); break;
    case 'f':  ret.push('前舌'); break;
    }

    const m2 = pfn.match(/o\d?/);
    switch (m2 ? m2[0] : 'o0') {
    case 'o0': ret.push('狭'); break;
    case 'o2': ret.push('広めの狭'); break;
    case 'o4': ret.push('半狭'); break;
    case 'o5': ret.push('中央'); break;
    case 'o6': ret.push('半広'); break;
    case 'o8': ret.push('狭めの広'); break;
    case 'o':  ret.push('広'); break;
    }

    ret.push('母音');
    return ret.join('');
}
function update_v_info(elem, pfn)
{
    document.getElementById('en').textContent = get_v_en_name(pfn);
    document.getElementById('ja').textContent = get_v_ja_name(pfn);
    document.getElementById('ipa').textContent = elem.textContent;
    document.getElementById('xsampa').textContent = elem.dataset.xsampa ?? elem.textContent;
    document.getElementById('pfn').textContent = pfn;

    const synth = new VoiceSynth(VoiceSynth.default_voice());
    const src_list = [
        pfn + " 5 ! 2 p 8 p0 0 A0 +5 A 9 A ^ A0",
        "=0.25 .",
    ];
    synth.set_pfn(src_list, 180, 4800, 600, 1.0);
    const buf = new Float32Array(synth.get_remaining());
    synth.generate(buf);
    return buf;
}

document.addEventListener('DOMContentLoaded', () =>
{
    const spectrum = document.getElementById('spectrum');
    const play_btn = document.getElementById('play');
    const player = new WavPlayer(SAMPLING_RATE, 0.3, 0.9);
    let wavebuf = null;
    let selected_cell = null;

    function select_cell(target) {
        if (selected_cell) selected_cell.classList.remove('selected');
        selected_cell = target;
        selected_cell.classList.add('selected');
        const pfn = selected_cell.dataset.pfn;
        if (!pfn) {
            wavebuf = null;
            return;
        }
        if (selected_cell.dataset.vowel) {
            wavebuf = update_v_info(selected_cell, pfn);
        } else {
            wavebuf = update_c_info(selected_cell, pfn);
        }
        if (wavebuf) {
            show_spectrum(spectrum, wavebuf);
        } else {
            spectrum.getContext('2d').clearRect(0, 0, spectrum.width, spectrum.height);
        }
        play_btn.disabled = !wavebuf;
    }

    document.getElementById('flow').addEventListener('click', e => {
        const target = e.target;
        if (target.classList.contains('ipa')) {
            select_cell(target);
        }
    });
    play_btn.addEventListener('click', e => {
        const t = e.currentTarget;
        if (wavebuf) {
            const t = e.currentTarget;
            t.disabled = true;
            player.play(wavebuf).then(() => t.disabled = false);
        }
    });

    select_cell(document.getElementById('phone-def'));
});
