class SpeechInc
{
    constructor(init) {
        this.base = init;
        this.diff = 0;
        this.ticks = 0;
        this.last = 0;
    }
    set(c) {
        this.base += this.diff;
        this.diff = c.val - this.base;
        this.ticks = c.ticks;
        this.len = c.len;
    }
    get(ticks) {
        const t = ticks - this.ticks;
        if (t < 0) {
            return this.base;
        } else if (t < this.len) {
            return this.base + this.diff * t / this.len;
        } else {
            return this.base + this.diff;
        }
    }
}

export class SpeechNote
{
    static MARGIN = 16;

    static #svg(name, attr, content) {
        const e = document.createElementNS('http://www.w3.org/2000/svg', name);
        if (attr) {
            for (const k in attr) {
                e.setAttribute(k, attr[k]);
            }
        }
        if (content) {
            e.textContent = content;
        }
        return e;
    }

    constructor(vsynth, sampling_rate) {
        this.sampling_rate = sampling_rate;
        this.total_ticks = vsynth.get_remaining();
        const chunks = vsynth.get_chunk_count();
        this.scale = chunks > 0 ? 80 * vsynth.get_chunk_count() / this.total_ticks : 1;

        this.chunks = [];
        this.commands = [];
        const vp = new Set();
        for (const c of vsynth.cmd_list) {
            if (c.cmd === 'chunk') {
                if (c.len > 0) {
                    this.chunks.push({ticks:c.ticks, len:c.len, n:c.val});
                    this.commands.push({ticks:c.ticks + c.len * 0.125, len:0, key:'title', val:c.val});
                }
                continue;
            } else if (c.cmd === 'fmt') {
                this.commands.push({ticks:c.ticks, len:c.len, key:'fmt', val:c.val});
                if (c.val.c !== undefined) {
                    this.commands.push({ticks:c.ticks, len:c.len, key:'c', val:c.val.c});
                }
            } else if (c.cmd === 'P') {
                this.commands.push({ticks:c.ticks, len:c.len, key:'P', val:(c.val - 4800) / 400});
            } else if (c.cmd === 'A' || c.cmd === 'v') {
                this.commands.push({ticks:c.ticks, len:c.len, key:c.cmd, val:c.val});
            } else {
                continue;
            }
            vp.add(c.ticks);
            if (c.len > 0) vp.add(c.ticks + c.len);
        }
        vp.add(this.total_ticks);
        for (const t of vp) {
            this.commands.push({ticks:t, key:'pt'});
        }
        this.#add_ipa_commands();
        this.commands.sort((a, b) => {
            const t = a.ticks - b.ticks;
            if (t !== 0) return t;
            return a.key === 'pt' ? 1 : b.key === 'pt' ? -1 : 0;
        });
    }
    #add_ipa_commands() {
        const a = [];
        const prm_v = new SpeechInc(0);
        let fmt = null;
        let prev_fmt_ticks = -1;
        let amp = true;
        let amp1_ticks = -1;

        for (const c of this.commands) {
            switch (c.key) {
            case 'fmt':
                if (amp1_ticks >= 0 && amp1_ticks <= c.ticks) {
                    if (a.length > 0) {
                        a.push(null);
                    }
                    amp1_ticks = -1;
                }
                if (fmt !== null) {
                    if (prev_fmt_ticks === c.ticks) a.pop();
                    prev_fmt_ticks = c.ticks;
                    a.push({ticks:prev_fmt_ticks, vcd:prm_v.get(c.ticks), f:fmt});
                }
                if (fmt === null || c.len > 0) {
                    prev_fmt_ticks = c.ticks + c.len;
                    a.push({ticks:prev_fmt_ticks, vcd:prm_v.get(c.ticks + c.len), f:c.val});
                }
                fmt = c.val;
                break;
            case 'v':
                prm_v.set(c);
                break;
            case 'A':
                if (c.val === 0) {
                    amp = false;
                } else if (!amp) {
                    amp1_ticks = c.ticks;
                    amp = true;
                }
                break;
            }
        }
        const semivowel_thres = (this.sampling_rate * 0.1) | 0;
        for (let i = 0; i < a.length; i++) {
            const f1 = a[i];
            if (f1 === null) continue;
            const f0 = i > 0 ? a[i - 1] : null;
            const f2 = i < a.length - 1 ? a[i + 1] : null;
            let c = null;
            if (f0 === null || !SpeechNote.#eq(f1.f, f0.f)) {
                if (SpeechNote.#is_consonant(f1.f) || (f2 !== null && f2.ticks - f1.ticks < semivowel_thres && !SpeechNote.#eq(f1.f, f2.f) && !SpeechNote.#is_consonant(f2.f))) {
                    c = SpeechNote.#get_consonant(f1.f, f1.vcd >= 0.5);
                } else {
                    c = SpeechNote.#get_vowel(f1.f, f1.vcd);
                }
            }
            if (c !== null) {
                this.commands.push({ticks:f1.ticks, len:0, key:'phone', val:c});
            }
        }
    }
    static #is_consonant(f) {
        return f.f > 1.0 ||
            f.n > 0.7 ||
            f.a > 0.2 ||
            f.s > 0.2 ||
            f.c > 0.2;
    }
    static #eq(f1, f2) {
        return Math.abs(f1.f - f2.f) < 0.1 &&
            Math.abs(f1.e - f2.e) < 0.1 &&
            Math.abs(f1.o - f2.o) < 0.1 &&
            Math.abs(f1.L - f2.L) < 0.1 &&
            Math.abs(f1.r - f2.r) < 0.1 &&
            Math.abs(f1.a - f2.a) < 0.1 &&
            Math.abs(f1.s - f2.s) < 0.1 &&
            Math.abs(f1.n - f2.n) < 0.1 &&
            Math.abs(f1.c - f2.c) < 0.1;
    }
    static #get_vowel(fmt, v) {
        let i;
        if (fmt.f > 0.6) {
            i = 0;
        } else if (fmt.f > 0.4) {
            i = 2;
        } else {
            i = 4;
        }
        if (fmt.L > 0.4) i++;
        let c;
        if (fmt.o < 0.15) {
            c = ['i', 'y', 'ɨ', 'ʉ', 'ɯ', 'u'][i];
        } else if (fmt.o < 0.35) {
            c = ['ɪ', 'ʏ', 'ɪ̈', 'ʊ̈', 'ɯ̽', 'ʊ'][i];
        } else if (fmt.o < 0.45) {
            c = ['e', 'ø', 'ɘ', 'ɵ', 'ɤ', 'o'][i];
        } else if (fmt.o < 0.55) {
            c = ['e̞', 'ø̞', 'ə', 'ɵ̞', 'ɤ̞', 'o̞'][i];
        } else if (fmt.o < 0.65) {
            c = ['ɛ', 'œ', 'ɜ', 'ɞ', 'ʌ', 'ɔ'][i];
        } else if (fmt.o < 0.85) {
            c = ['æ', 'æ̹', 'ɐ', 'ɐ̹', 'ʌ̞', 'ɔ̞'][i];
        } else {
            c = ['a', 'ɶ', 'ä', 'ɶ̈', 'ɑ', 'ɒ'][i];
        }
        if (fmt.r > 0.4) {
            c += "\u02DE"; // rzd
        }
        if (fmt.n > 0.3) {
            c += "\u0303"; // nzd
        }
        if (v < 0.3) {
            c += "\u0325"; // vls
        } else if (v < 0.7) {
            c += "\u0324"; // mrm
        } else if (v < 1.3) {
        } else if (v < 1.7) {
            c += "\u0330"; // crk
        } else {
            c += 'ʔ';
        }
        return c;
    }
    static #get_consonant(fmt, v) {
        let c = '';
        const r = fmt.r >= 0.5;
        if (fmt.L > 0.8) { // blb/lbd
            if (fmt.n > 0.8) {
                c = 'm';
                if (!v) c += "\u0325";
            } else if (fmt.c > 0.8) {
                c = v ? 'b' : 'p';
            } else if (fmt.c > 0.2) {
                c = v ? 'v' : 'f';
            } else {
                c = 'β̞';
                if (!v) c += "\u0325";
            }
        } else if (fmt.f > 1.5) { // alv
            if (fmt.n > 0.8) {
                c = r ? 'ɳ' : 'n';
                if (!v) c += "\u0325";
            } else if (fmt.c > 0.8) {
                c = v ? (r ? 'ɖ' : 'd') : (r ? 'ʈ' : 't');
            } else if (fmt.c > 0.2) {
                c = v ? (r ? 'ʐ' : 'z') : (r ? 'ʂ' : 's');
            } else {
                c = r ? 'ɻ' : 'ɹ';
                if (!v) c += "\u0325";
            }
        } else if (fmt.f > 0.5) { // pal
            if (fmt.n > 0.8) {
                c = 'ɲ';
                if (!v) c += "\u0325";
            } else if (fmt.c > 0.8) {
                c = v ? 'ɟ' : 'c';
            } else if (fmt.c > 0.2) {
                c = v ? 'ʝ' : 'ç';
            } else {
                c = 'j';
                if (!v) c += "\u0325";
            }
        } else if (fmt.o < 0.5) { // vel
            if (fmt.n > 0.8) {
                c = 'ŋ';
                if (!v) c += "\u0325";
            } else if (fmt.c > 0.8) {
                c = v ? 'g' : 'k';
            } else if (fmt.c > 0.2) {
                c = v ? 'ɣ' : 'x';
            } else {
                c = 'ɰ';
                if (!v) c += "\u0325";
            }
            if (fmt.e > 0.5) {
                c += "ʲ";
            }
        } else { // uvl
            if (fmt.n > 0.8) {
                c = 'ɴ';
                if (!v) c += "\u0325";
            } else if (fmt.c > 0.8) {
                c = v ? 'ɢ' : 'q';
            } else if (fmt.c > 0.2) {
                c = v ? 'χ' : 'x';
            } else {
                c = v ? 'ʁ̞' : 'χ˕';
            }
            if (fmt.e > 0.5) {
                c += "ʲ";
            }
        }
        return c;
    }

    draw(svg) {
        svg.replaceChildren();
        this.#set_width(svg);
        this.#set_tone_curve(svg);
        const chunk = this.#set_chunk(svg);
        return chunk;
    }
    #set_width(svg) {
        const w = this.total_ticks * this.scale + SpeechNote.MARGIN * 2;
        svg.style.width = w + 'px';
        svg.viewBox.baseVal.width = w;
    }

    #set_chunk(svg) {
        const chunk = [];
        for (const c of this.chunks) {
            const x = c.ticks * this.scale + SpeechNote.MARGIN;
            const w = c.len * this.scale;
            const rc = SpeechNote.#svg('rect', {'class':'note-chunk', x:x, y:0, width:w, height:220, 'data-i':chunk.length});
            svg.appendChild(rc);
            chunk.push(rc);
        }
        return chunk;
    }

    #set_tone_curve(svg) {
        const HEIGHT = 80;
        const BASE = 140;
        const prm = {
            c: new SpeechInc(0),
            P: new SpeechInc(0),
            A: new SpeechInc(0),
        };
        const ret = [];

        for (const c of this.commands) {
            if (c.key === 'pt') {
                if (c.ticks > 0 && prm.P.len === 0 && prm.P.ticks === c.ticks) {
                    ret.push({
                        ticks: c.ticks,
                        c:prm.c.get(c.ticks),
                        P:prm.P.base,
                        A:prm.A.get(c.ticks),
                    });
                }
                ret.push({
                    ticks: c.ticks,
                    c:prm.c.get(c.ticks),
                    P:prm.P.get(c.ticks),
                    A:prm.A.get(c.ticks),
                });
            } else if (c.key === 'title') {
                const x = c.ticks * this.scale + SpeechNote.MARGIN;
                const y = BASE - prm.P.get(c.ticks) * HEIGHT - 20;
                svg.appendChild(SpeechNote.#svg('text', {x:(x | 0), y:(y | 0), 'class':'ipa'}, c.val));
            } else if (c.key === 'phone') {
                const x = c.ticks * this.scale + SpeechNote.MARGIN;
                const y = BASE - prm.P.get(c.ticks) * HEIGHT + 30;
                svg.appendChild(SpeechNote.#svg('text', {x:(x | 0), y:(y | 0), 'class':'ipa'}, c.val));
            } else if (c.key in prm) {
                prm[c.key].set(c);
            }
        }
        if (ret.length < 2) return;
        const d = [];
        {
            const c = ret[0];
            const x = SpeechNote.MARGIN;
            const y = BASE - c.P * HEIGHT;
            d.push('M' + x + ',' + y);
        }
        for (let i = 1; i < ret.length - 1; i++) {
            const c = ret[i];
            const x = c.ticks * this.scale + SpeechNote.MARGIN;
            const y = BASE - c.P * HEIGHT;
            const v = c.A * (1 - c.c);
            d.push('L' + (x | 0) + ',' + ((y - v * 10) | 0));
        }
        {
            const c = ret.at(-1);
            const x = c.ticks * this.scale + SpeechNote.MARGIN;
            const y = BASE - c.P * HEIGHT;
            d.push('L' + (x | 0) + ',' + (y | 0));
        }
        for (let i = ret.length - 2; i >= 1; i--) {
            const c = ret[i];
            const x = c.ticks * this.scale + SpeechNote.MARGIN;
            const y = BASE - c.P * HEIGHT;
            const v = c.A * (1 - c.c);
            d.push('L' + (x | 0) + ',' + ((y + v * 10) | 0));
        }
        d.push('z');
        svg.appendChild(SpeechNote.#svg('path', {'class':'note-tone', d:d.join(' ')}));
    }
}
