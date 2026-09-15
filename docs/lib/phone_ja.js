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

export class JaToPFN
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
            gw: 'f0L5' + v + 'c +20 c0 +10',
            G: 'o4' + v + 'c7 +20 c7 +30',
            Gy: 'ef0' + v + 'c7 +20 c7 +20',
            'g~': 'o6n' + v + ' +60',
            'g~y': 'eo6n' + v + ' +60',
            s: 'Fv0c5s +40 c5s +10 v0c0 +10',
            sh: 'Fv0c5s +20 fv0c5s +20 c0 +10 v0 +20',
            z: 'F' + v + 'c4s +40 c4s +10 c0 +10',
            j: 'F' + v + 'c5s +20 f' + v + 'c5s +10 c5s +10',
            t: 'Fv0c +20 c0 +20 v0 +20',
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
            v: 'L' + v + 'c7 +20 c7 +30',
            vy: 'fL' + v + 'c7 +20 c7 +30',
            hy: 'fv0c7 +20 v0c7 +40',
            f: 'L7v0c5 +30 c5 +10 v0 +10',
            m: 'Ln' + v + ' +70',
            my: 'fLn' + v + ' +30',
            y: 'f' + v + ' +70',
            r: 'F' + v + 'c4 +10 c0 +60',
            ry: 'Fe' + v + 'c4 +20',
            w: 'L8' + v + ' +50',
            q: 'g +40 +g +30',
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
            this.vowel['y' + k] = k === 'i' ? vwl : 'f' + JaToPFN.get_v(vwl, 'L') + v + ' +20 ' + vwl;
            this.vowel['w' + k] = JaToPFN.get_v(vwl, 'f') + 'L' + v + ' +20 ' + vwl;
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
        let edge_count = 0;

        for (const m of src.matchAll(/'| |(ky|kw|k|gy|gw|g~y|g~|g|sh|s|j|z|ts|t|ch|d|ny|n|hy|h|f|by|b|py|p|my|m|y|ry|r|w|q)?([aiueo])?/gi)) {
            if (m[0] === ' ') {
                if (prev_mola) {
                    if (this.voiceless) {
                        prev_mola.set_vowel_voiceless(null);
                    }
                    if (edge_count >= 2 && this.reduce_pitch) {
                        for (let i = edge; i < ret.length && ret[i].pitch === 10; i++) {
                            ret[i].pitch = 6;
                        }
                    }
                    prev_mola.amp += ' 7 A8 ^ A0';
                    prev_mola = null;
                    prev_q = false;
                    edge_count = 0;
                }
                ret.push('|.');
            }
            const cns = m[1] || '';
            const vwl = m[2] || '';
            if (cns === '' && vwl === '') continue;

            const vwl_l = vwl.toLowerCase();
            const cns_l = cns.toLowerCase();
            const pitch = (vwl !== vwl_l || cns !== cns_l) ? 10 : 0;

            let consonant = this.consonant[cns_l] || '';
            let vowel = this.vowel[vwl_l] || '';

            if (cns_l !== '' && vwl_l === 'i') {
                // palatalization
                if ('kg~nhpbmr'.indexOf(cns_l) >= 0) {
                    if (prev_mola && prev_mola.v !== '') {
                        switch (cns_l) {
                        case 'g': consonant = this.consonant.Gy; break;
                        case 'b': consonant = this.consonant.vy; break;
                        default: consonant = this.consonant[cns_l + 'y']; break;
                        }
                    } else {
                        consonant = this.consonant[cns_l + 'y'];
                    }
                }
            } else if (prev_mola && prev_mola.v !== '') {
                switch (cns_l) {
                case 'g': consonant = this.consonant.G; break;
                case 'gy': consonant = this.consonant.Gy; break;
                case 'b': consonant = this.consonant.v; break;
                case 'by': consonant = this.consonant.vy; break;
                }
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
                    c2 += JaToPFN.get_v(vw, k);
                }
                consonant = c2 + consonant;
            }
            if (cns_l === 'q' && vwl_l === '') {
                consonant = 'g 8 g';
            }

            const mola = new Mola(consonant, vowel, cns_l, vwl_l, pitch);

            if (pitch === 10 && (!prev_mola || prev_mola.pitch === 0)) {
                edge = ret.length;
                edge_count++;
            }

            if (prev_mola && prev_mola.c_name === 'n' && prev_mola.v_name === '') {
                // 「ん」の異音
                switch (cns_l[0]) {
                case '':
                    prev_mola.c = mola.v + 'n6';
                    break;
                case 'k': case 'g':
                case 'ky': case 'gy':
                    prev_mola.c = 'f0n' + v;
                    break;
                case 't': case 'd': case 'n':
                case 'ch': case 'j': case 'ny':
                case 's': case 'z': case 'sh': case 'j':
                    prev_mola.c = 'Fn' + v;
                    break;
                case 'p': case 'b': case 'm':
                case 'py': case 'by': case 'my': case 'w':
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
                mola.amp = '0 A0 +10 A 7 A8';
            }
            ret.push(mola);
            prev_mola = mola;
        }
        if (prev_mola) {
            if (this.voiceless) {
                prev_mola.set_vowel_voiceless(null);
            }
            prev_mola.amp += ' 7 A8 ^ A0';
        }
        if (edge_count >= 2 && this.reduce_pitch) {
            for (let i = edge; i < ret.length && ret[i].pitch === 10; i++) {
                ret[i].pitch = 5;
            }
        }
        return ret.map(m => m.toString());
    }
}
