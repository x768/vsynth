class SpeechInc
{
    constructor(init) {
        this.base = init;
        this.diff = 0;
        this.ticks = 0;
        this.last = 0;
    }
    set(c) {
        if (c.len > 0) {
            this.base += this.diff;
            this.diff = c.val - this.base;
            this.ticks = c.ticks;
            this.len = c.len;
        } else {
            this.base = c.val;
            this.diff = 0;
            this.ticks = c.ticks;
            this.len = 0;
        }
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

    constructor(vsynth) {
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
                this.commands.push({ticks:c.ticks, len:c.len, key:'c', val:c.val.c});
            } else if (c.cmd === 'P') {
                this.commands.push({ticks:c.ticks, len:c.len, key:'P', val:(c.val - 4800) / 400});
            } else if (c.cmd === 'A') {
                this.commands.push({ticks:c.ticks, len:c.len, key:'A', val:c.val});
            } else {
                continue;
            }
            vp.add(c.ticks);
            if (c.len > 0) vp.add(c.ticks + c.len);
        }
        for (const t of vp) {
            this.commands.push({ticks:t, key:'pt'});
        }
        this.#get_ipa(vsynth.cmd_list.filter(c => c.cmd === 'fmt' || c.cmd === 'v' || (c.cmd === 'A' && c.val === 0)));
        this.commands.sort((a, b) => {
            const t = a.ticks - b.ticks;
            if (t !== 0) return t;
            if (a.key === 'pt') return 1;
            if (b.key === 'pt') return -1;
            return 0;
        });
    }
    #get_ipa(cmd) {
        let fmt = null;
        let v = 0;

        for (let i = 0; i < cmd.length; i++) {
            const c = cmd[i];
            const next = i < cmd.length - 1 ? cmd[i + 1] : null;
        }
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
                ret.push({
                    ticks: c.ticks,
                    c:prm.c.get(c.ticks),
                    P:prm.P.get(c.ticks),
                    A:prm.A.get(c.ticks),
                });
            } else if (c.key === 'title') {
                const x = c.ticks * this.scale + SpeechNote.MARGIN;
                const y = BASE - prm.P.get(c.ticks) * HEIGHT - 20;
                svg.appendChild(SpeechNote.#svg('text', {x:x, y:y}, c.val));
            } else if (c.key === 'phone') {
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
            d.push('L' + x + ',' + (y - v * 10));
        }
        {
            const c = ret.at(-1);
            const x = c.ticks * this.scale + SpeechNote.MARGIN;
            const y = BASE - c.P * HEIGHT;
            d.push('L' + x + ',' + y);
        }
        for (let i = ret.length - 2; i >= 1; i--) {
            const c = ret[i];
            const x = c.ticks * this.scale + SpeechNote.MARGIN;
            const y = BASE - c.P * HEIGHT;
            const v = c.A * (1 - c.c);
            d.push('L' + x + ',' + (y + v * 10));
        }
        d.push('z');
        svg.appendChild(SpeechNote.#svg('path', {'class':'note-tone', d:d.join(' ')}));
    }
}
