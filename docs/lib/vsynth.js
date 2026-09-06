export const SAMPLING_RATE = 24000;

const N_PEAKS = 7;
const N_PEAK_ARRAY = 7 * 4;

const MAX_HARMONIC = 400; // 400 * 50Hz = 20 kHz, more than enough
const STEPSIZE = 64;   // 2.666[ms] at 24 kHz sample rate
const N_HARMONIC_PEAKS = 5;

const p_keys = "APv";
const fmt_keys = "feoLrancs";

class Voice
{
    static #diff(f1, f2) {
        const ret = new Int32Array(N_PEAK_ARRAY);
        for (let i = 0; i < N_PEAK_ARRAY; i++) {
            ret[i] = f1[i] - f2[i];
        }
        return ret;
    }
    static #apply_v(fr, voice) {
        const ret = new Int32Array(N_PEAK_ARRAY);
        for (let i = 0; i < N_PEAKS; i++) {
            const j = i * 4;
            ret[j    ] = (fr[j    ] * voice.freq[i]) << 8;   // freq
            ret[j + 1] = (fr[j + 1] * voice.height[i]) << 6; // height
            ret[j + 2] = (fr[j + 2] * voice.width[i]) << 10; // left
            ret[j + 3] = (fr[j + 3] * voice.width[i]) << 10; // right
        }
        return ret;
    }

    constructor(voice) {
        // cols: freq, height, left, right
        const u = [
            120,18,168,107,
            336,70,112,112,
            1880,70,148,120,
            2460,56,120,120,
            3300,45,120,120,
            3940,38,120,120,
            6746,20,0,0,
        ];
        const i = [
            152,10,167,167,
            280,73,105,90,
            2280,69,120,120,
            2840,69,120,120,
            3400,69,120,120,
            3840,41,120,120,
            6816,15,0,0,
        ];
        const ao = [
            240,39,205,245,
            814,68,160,150,
            874,75,141,118,
            2586,51,120,120,
            3340,50,120,120,
            3860,31,120,120,
            7122,18,0,0,
        ];
        const ae = [
            298,41,213,227,
            896,90,135,180,
            1580,83,180,150,
            2500,75,120,120,
            3380,53,120,120,
            3780,33,120,120,
            7232,11,0,0,
        ];
        const al = [
            136,20,200,200,
            200,44,212,212,
            1600,40,187,187,
            2600,30,255,255,
            3560,28,255,255,
            4120,10,175,175,
            5500,4,0,0,
        ];
        const x1 = Voice.#diff(i, u);
        const x2 = Voice.#diff(al, i);
        const y1 = Voice.#diff(ao, u);
        const y2 = Voice.#diff(ae, i);
        const yx = Voice.#diff(y2, y1);

        this.freqadd = voice.freqadd;
        this.u = Voice.#apply_v(u, voice);
        this.i = Voice.#apply_v(i, voice);
        this.x1 = Voice.#apply_v(x1, voice);
        this.x2 = Voice.#apply_v(x2, voice);
        this.y1 = Voice.#apply_v(y1, voice);
        this.y2 = Voice.#apply_v(y2, voice);
        this.yx = Voice.#apply_v(yx, voice);
        this.nas = [
            (160 * voice.freq[0]) << 8, // freq
            (90 * voice.height[0]) << 6, // height
            (160 * voice.width[0]) << 10, // left
            (160 * voice.width[0]) << 10, // right
        ];
        this.tmp = new Array(N_PEAK_ARRAY);

        this.pitch = (voice.pitch * 260) | 0;
        this.flutter = voice.flutter;
        this.roughness = voice.roughness;
        this.fricative = voice.fricative;
    }

    static #merge(dst, f1, f2, r, upper) {
        const lo = (upper ? 2 : 0) * 4;
        const hi = (upper ? 7 : 2) * 4;
        for (let i = lo; i < hi; i++) {
            dst[i] = f1[i] + f2[i] * r;
        }
    }
    static #append(dst, f1, f2, r1, r2) {
        for (let i = 0; i < N_PEAK_ARRAY; i++) {
            const b = f1[i] + f2[i] * r2;
            dst[i] += b * r1;
        }
    }

    get_formant(f, fmt) {
        const tmp = this.tmp;
        if (fmt.e > 1) {
            Voice.#merge(tmp, this.i, this.x2, fmt.e - 1, false);
        } else {
            Voice.#merge(tmp, this.u, this.x1, fmt.e, false);
        }
        if (fmt.f > 1) {
            Voice.#merge(tmp, this.i, this.x2, fmt.f - 1, true);
        } else {
            Voice.#merge(tmp, this.u, this.x1, fmt.f, true);
        }
        if (fmt.o > 0) {
            Voice.#append(tmp, this.y1, this.yx, fmt.o, fmt.f);
        }

        const rnd = fmt.L * (0.6 - fmt.f * 0.2);
        if (rnd > 0) {
            // F2 freq
            tmp[2 * 4] *= 1 - rnd;
        }
        const rzd = fmt.r * 0.6;
        if (rzd > 0) {
            // F3 freq
            tmp[3 * 4] = tmp[2 * 4] * rzd + tmp[3 * 4] * (1 - rzd);
        }
        const lat = fmt.a;
        if (lat > 0) {
            // F2 freq
            tmp[2 * 4] *= (1 - lat * 0.4);
            for (let i = 3; i < N_PEAKS; i++) {
                tmp[i * 4] *= (1 + lat * 0.15);
            }
        }
        const stp = fmt.c;
        const nas = fmt.n;
        if (nas > 0) {
            const n1 = 1 - nas;
            const s = 1 - stp;
            // F0 = nasal
            tmp[0] = tmp[0] * n1 + this.nas[0] * nas;
            tmp[1] = tmp[1] * n1 * s + this.nas[1] * nas;
            tmp[2] = tmp[2] * n1 + this.nas[2] * nas;
            tmp[3] = tmp[3] * n1 + this.nas[3] * nas;

            for (let i = 1; i < N_PEAKS; i++) {
                tmp[i * 4 + 1] *= n1 * s;
            }
        } else if (stp > 0) {
            const s = 1 - stp;
            for (let i = 0; i < N_PEAKS; i++) {
                tmp[i * 4 + 1] *= s;
            }
        }

        for (let i = 0; i < N_PEAKS; i++) {
            const j = i * 4;
            f[j] = this.tmp[j] + ((this.freqadd[i] * 256) << 8);
            f[j + 1] = this.tmp[j + 1];
            f[j + 2] = this.tmp[j + 2];
            f[j + 3] = this.tmp[j + 3];
        }
    }
}
class Formants
{
    constructor() {
        this.base = new Int32Array(N_PEAK_ARRAY);
        this.diff = new Int32Array(N_PEAK_ARRAY);
        this.fmt = new Int32Array(N_PEAK_ARRAY);
        this.p = new Array(N_PEAKS);
        for (let i = 0; i < N_PEAKS; i++) {
            this.p[i] = {
                freq:0,
                height:0,
                left:0,
                right:0,
            };
        }
        this.prm_base = {};
        this.prm_diff = {};
        this.prm = {};
        this.length = 0;
        this.last = 0;
    }
    #update() {
        for (let i = 0; i < N_PEAKS; i++) {
            const j = i * 4;
            const p = this.p[i];
            p.freq = this.fmt[j];
            p.height = this.fmt[j + 1];
            p.left = this.fmt[j + 2];
            p.right = this.fmt[j + 3];
        }
    }
    set(voice, length, prm) {
        voice.get_formant(this.base, prm);
        for (const k of fmt_keys) {
            this.prm_base[k] = prm[k];
        }
        if (length > 0) {
            for (let i = 0; i < N_PEAK_ARRAY; i++) {
                this.diff[i] = this.fmt[i] - this.base[i];
            }
            for (const k of fmt_keys) {
                this.prm_diff[k] = this.prm[k] - prm[k];
            }
        } else {
            for (let i = 0; i < N_PEAK_ARRAY; i++) {
                this.fmt[i] = this.base[i];
                this.diff[i] = this.fmt[i] - this.base[i];
            }
            for (const k of fmt_keys) {
                this.prm[k] = prm[k];
                this.prm_diff[k] = this.prm[k] - prm[k];
            }
            this.#update();
        }
        this.length = length;
        this.last = length;
    }
    next(n) {
        if (this.last === 0) return;
        this.last -= n;
        if (this.last < 0) this.last = 0;

        const r = this.last / this.length;
        for (let i = 0; i < N_PEAK_ARRAY; i++) {
            this.fmt[i] = this.base[i] + this.diff[i] * r;
        }
        for (const k of fmt_keys) {
            this.prm[k] = this.prm_base[k] + this.prm_diff[k] * r;
        }
        this.#update();
    }
}
class Resonator
{
    constructor() {
        this.a = 0;
        this.b = 0;
        this.c = 0;
        this.p1 = 0;
        this.p2 = 0;
        this.amp = 0;
    }

    set_param(f, bw, amp) {
		const pi_t = Math.PI / SAMPLING_RATE;
        const r = Math.exp(-pi_t * bw);
        this.c = -(r * r);
        this.b = r * Math.cos(2 * pi_t * f) * 2.0;
        this.a = 1.0 - this.b - this.c;
        this.amp = amp;
    }

    get(input) {
        const x = this.a * input + this.b * this.p1 + this.c * this.p2;
        this.p2 = this.p1;
        //this.p1 = x < -0.4 ? -0.4 : x > 0.4 ? 0.4 : x;
        this.p1 = x;
        return x * this.amp;
    }

    get_limit(input) {
        const x = this.a * input + this.b * this.p1 + this.c * this.p2;
        this.p2 = this.p1;
        this.p1 = x < -0.4 ? -0.4 : x > 0.4 ? 0.4 : x;
        return x * this.amp;
    }

    clear() {
        this.amp = 0;
        this.p1 = 0;
        this.p2 = 0;
    }
}
class ResonatorSet
{
    constructor(n) {
        this.seed = 0x732F732F;

        this.r = new Array(n);
        for (let i = 0; i < n; i++) {
            this.r[i] = new Resonator();
        }
        this.stp = new Resonator();
        this.stp_last = 0;
        this.prev_c = 0;
        this.prev_L = 0;
    }

    set_vertex(fmt, vp) {
        const c0 = fmt.prm.c;
        const c1 = fmt.prm_base.c;
        if (c0 > 0.95 && c1 <= 0.95) {
            this.stp_last = 4;
            this.prev_L = fmt.prm.L;
        }
    }
    set_peaklist(list) {
        for (let ix = 0; ix < this.r.length; ix++) {
            const p = list.p[ix];
            const freq = p.freq >> 16;
            const width = p.left >> 18;
            const height = p.height >> 15;
            this.r[ix].set_param(freq, width, height);
        }
    }
    modify(fmt, vp) {
        const prm = fmt.prm;
        const c = prm.c;
        const base_c = fmt.prm_base.c;

        if (this.stp_last > 0) {
            let w = 0.125 * (1 + prm.o);
            let amp;
            let pitch;
            if (this.prev_L > 0.85) {
                // blb
                pitch = 600;
                amp = 0.15;
            } else {
                pitch = (prm.f + 2) * 900;
                amp = 0.10;
            }
            this.stp.set_param(pitch, pitch * w, (c - 0.5) * amp * this.stp_last);

            this.stp_last--;
        } else if (c < 0.85 && prm.s > 0) {
            // Sibilant
            const w = 0.9;
            const pitch = 3400;
            this.stp.set_param(pitch, pitch * w, prm.s * 0.04);
        } else {
            this.stp.clear();
        }
        this.prev_c = base_c;
    }

    get(amp) {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        const v = this.seed / 0x7fffffff - 0.5;
        let sum = 0;
        for (let i = 0; i < this.r.length; i++) {
            sum += this.r[i].get(v) * amp;
        }
        if (this.stp_last > 0) {
            sum += this.stp.get_limit(v);
        } else {
            sum += this.stp.get(v);
        }
        return sum;
    }
}
class Interpolation
{
    constructor(val) {
        this.val = val;
        this.base = val;
        this.range = 0;
        this.length = 0;
        this.last = 0;
    }
    set(length, val) {
        if (this.val === val) {
            this.length = 0;
            this.last = 0;
            this.base = val;
        } else {
            this.length = length;
            this.last = this.length;
            this.base = val;
            if (this.length === 0) {
                this.val = val;
            } else {
                this.range = this.val - val;
            }
        }
    }
    next(n) {
        if (this.last > n) {
            this.last -= n;
            this.val = this.base + this.range * this.last / this.length;
        } else {
            this.last = 0;
            this.val = this.base;
        }
    }
}

class FloatBuffer
{
    constructor(buf) {
        this.buf = buf;
        this.idx = 0;
    }
    is_full() {
        return this.idx >= this.buf.length;
    }
    push(v) {
        this.buf[this.idx++] = v;
    }
}

export class VoiceSynth
{
    static pk_shape1 = new Uint8Array([
        255, 254, 254, 254, 254, 254, 253, 253, 252, 251, 251, 250, 249, 248, 247, 246,
        245, 244, 242, 241, 239, 238, 236, 234, 233, 231, 229, 227, 225, 223, 220, 218,
        216, 213, 211, 209, 207, 205, 203, 201, 199, 197, 195, 193, 191, 189, 187, 185,
        183, 180, 178, 176, 173, 171, 169, 166, 164, 161, 159, 156, 154, 151, 148, 146,
        143, 140, 138, 135, 132, 129, 126, 123, 120, 118, 115, 112, 108, 105, 102,  99,
         96,  95,  93,  91,  90,  88,  86,  85,  83,  82,  80,  79,  77,  76,  74,  73,
         72,  70,  69,  68,  67,  66,  64,  63,  62,  61,  60,  59,  58,  57,  56,  55,
         55,  54,  53,  52,  52,  51,  50,  50,  49,  48,  48,  47,  47,  46,  46,  46,
         45,  45,  45,  44,  44,  44,  44,  44,  44,  44,  43,  43,  43,  43,  44,  43,
         42,  42,  41,  40,  40,  39,  38,  38,  37,  36,  36,  35,  35,  34,  33,  33,
         32,  32,  31,  30,  30,  29,  29,  28,  28,  27,  26,  26,  25,  25,  24,  24,
         23,  23,  22,  22,  21,  21,  20,  20,  19,  19,  18,  18,  18,  17,  17,  16,
         16,  15,  15,  15,  14,  14,  13,  13,  13,  12,  12,  11,  11,  11,  10,  10,
         10,   9,   9,   9,   8,   8,   8,   7,   7,   7,   7,   6,   6,   6,   5,   5,
          5,   5,   4,   4,   4,   4,   4,   3,   3,   3,   3,   2,   2,   2,   2,   2,
          2,   1,   1,   1,   1,   1,   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,  0
    ]);
    static flutter_tab = new Uint8Array([
        0x80, 0x9b, 0xb5, 0xcb, 0xdc, 0xe8, 0xed, 0xec,
        0xe6, 0xdc, 0xce, 0xbf, 0xb0, 0xa3, 0x98, 0x90,
        0x8c, 0x8b, 0x8c, 0x8f, 0x92, 0x94, 0x95, 0x92,
        0x8c, 0x83, 0x78, 0x69, 0x59, 0x49, 0x3c, 0x31,
        0x2a, 0x29, 0x2d, 0x36, 0x44, 0x56, 0x69, 0x7d,
        0x8f, 0x9f, 0xaa, 0xb1, 0xb2, 0xad, 0xa4, 0x96,
        0x87, 0x78, 0x69, 0x5c, 0x53, 0x4f, 0x4f, 0x55,
        0x5e, 0x6b, 0x7a, 0x88, 0x96, 0xa2, 0xab, 0xb0,

        0xb1, 0xae, 0xa8, 0xa0, 0x98, 0x91, 0x8b, 0x88,
        0x89, 0x8d, 0x94, 0x9d, 0xa8, 0xb2, 0xbb, 0xc0,
        0xc1, 0xbd, 0xb4, 0xa5, 0x92, 0x7c, 0x63, 0x4a,
        0x32, 0x1e, 0x0e, 0x05, 0x02, 0x05, 0x0f, 0x1e,
        0x30, 0x44, 0x59, 0x6d, 0x7f, 0x8c, 0x96, 0x9c,
        0x9f, 0x9f, 0x9d, 0x9b, 0x99, 0x99, 0x9c, 0xa1,
        0xa9, 0xb3, 0xbf, 0xca, 0xd5, 0xdc, 0xe0, 0xde,
        0xd8, 0xcc, 0xbb, 0xa6, 0x8f, 0x77, 0x60, 0x4b,

        0x3a, 0x2e, 0x28, 0x29, 0x2f, 0x3a, 0x48, 0x59,
        0x6a, 0x7a, 0x86, 0x90, 0x94, 0x95, 0x91, 0x89,
        0x80, 0x75, 0x6b, 0x62, 0x5c, 0x5a, 0x5c, 0x61,
        0x69, 0x74, 0x80, 0x8a, 0x94, 0x9a, 0x9e, 0x9d,
        0x98, 0x90, 0x86, 0x7c, 0x71, 0x68, 0x62, 0x60,
        0x63, 0x6b, 0x78, 0x88, 0x9b, 0xaf, 0xc2, 0xd2,
        0xdf, 0xe6, 0xe7, 0xe2, 0xd7, 0xc6, 0xb2, 0x9c,
        0x84, 0x6f, 0x5b, 0x4b, 0x40, 0x39, 0x37, 0x38,

        0x3d, 0x43, 0x4a, 0x50, 0x54, 0x56, 0x55, 0x52,
        0x4d, 0x48, 0x42, 0x3f, 0x3e, 0x41, 0x49, 0x56,
        0x67, 0x7c, 0x93, 0xab, 0xc3, 0xd9, 0xea, 0xf6,
        0xfc, 0xfb, 0xf4, 0xe7, 0xd5, 0xc0, 0xaa, 0x94,
        0x80, 0x71, 0x64, 0x5d, 0x5a, 0x5c, 0x61, 0x68,
        0x70, 0x77, 0x7d, 0x7f, 0x7f, 0x7b, 0x74, 0x6b,
        0x61, 0x57, 0x4e, 0x48, 0x46, 0x48, 0x4e, 0x59,
        0x66, 0x75, 0x84, 0x93, 0x9f, 0xa7, 0xab, 0xaa,

        0xa4, 0x99, 0x8b, 0x7b, 0x6a, 0x5b, 0x4e, 0x46,
        0x43, 0x45, 0x4d, 0x5a, 0x6b, 0x7f, 0x92, 0xa6,
        0xb8, 0xc5, 0xcf, 0xd3, 0xd2, 0xcd, 0xc4, 0xb9,
        0xad, 0xa1, 0x96, 0x8e, 0x89, 0x87, 0x87, 0x8a,
        0x8d, 0x91, 0x92, 0x91, 0x8c, 0x84, 0x78, 0x68,
        0x55, 0x41, 0x2e, 0x1c, 0x0e, 0x05, 0x01, 0x05,
        0x0f, 0x1f, 0x34, 0x4d, 0x68, 0x81, 0x9a, 0xb0,
        0xc1, 0xcd, 0xd3, 0xd3, 0xd0, 0xc8, 0xbf, 0xb5,

        0xab, 0xa4, 0x9f, 0x9c, 0x9d, 0xa0, 0xa5, 0xaa,
        0xae, 0xb1, 0xb0, 0xab, 0xa3, 0x96, 0x87, 0x76,
        0x63, 0x51, 0x42, 0x36, 0x2f, 0x2d, 0x31, 0x3a,
        0x48, 0x59, 0x6b, 0x7e, 0x8e, 0x9c, 0xa6, 0xaa,
        0xa9, 0xa3, 0x98, 0x8a, 0x7b, 0x6c, 0x5d, 0x52,
        0x4a, 0x48, 0x4a, 0x50, 0x5a, 0x67, 0x75, 0x82
    ]);
    static modulation_tab = new Uint8Array([
        0, 0x00, 0x00, 0x00, 0, 0x46, 0xf2, 0x29,
        0, 0x2f, 0x00, 0x2f, 0, 0x45, 0xf2, 0x29,
        0, 0x2f, 0x00, 0x2e, 0, 0x45, 0xf2, 0x28,
        0, 0x2e, 0x00, 0x2d, 0, 0x34, 0xf2, 0x28,
        0, 0x2d, 0x2d, 0x2c, 0, 0x34, 0xf2, 0x28,
        0, 0x2b, 0x2b, 0x2b, 0, 0x34, 0xf2, 0x28,
        0, 0x2a, 0x2a, 0x2a, 0, 0x34, 0xf2, 0x28,
        0, 0x29, 0x29, 0x29, 0, 0x34, 0xf2, 0x28,
    ]);
    static flutter_factor = new Uint8Array([
        3, 3, 2, 2, 1, 1, 1, 1, 1, 2, 3, 4, 6, 8, 12, 16, 16
    ]);
    static wavemult_tab = new Uint8Array([
          0,   0,   0,   2,   3,   5,   8,  11,  14,  18,  22,  27,  32,  37,  43,  49,
         55,  62,  69,  76,  83,  90,  98, 105, 113, 121, 128, 136, 144, 152, 159, 166,
        174, 181, 188, 194, 201, 207, 213, 218, 224, 228, 233, 237, 240, 244, 246, 249,
        251, 252, 253, 253, 253, 253, 252, 251, 249, 246, 244, 240, 237, 233, 228, 224,
        218, 213, 207, 201, 194, 188, 181, 174, 166, 159, 152, 144, 136, 128, 121, 113,
        105,  98,  90,  83,  76,  69,  62,  55,  49,  43,  37,  32,  27,  22,  18,  14,
         11,   8,   5,   3,   2,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
          0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0
    ]);

    static tone_adjust;
    static sin_tab;
    static freq_tab;

    static {
        const N_TONE_ADJUST = 1000;
        const tone_points = [600, 170, 1200, 135, 2000, 110, 3000, 110, -1, 0];
        let freq1 = 0;
        let height1 = tone_points[1];

        VoiceSynth.tone_adjust = new Uint8Array(N_TONE_ADJUST);
        for (let pt = 0; pt < 12; pt += 2) {
            if (tone_points[pt] === -1) {
                tone_points[pt] = N_TONE_ADJUST * 8;
                if (pt > 0) tone_points[pt + 1] = tone_points[pt - 1];
            }
            const freq2 = (tone_points[pt] / 8) | 0; // 8Hz steps
            const height2 = tone_points[pt + 1];
            if (freq2 - freq1 > 0) {
                for (let ix = freq1; ix < freq2; ix++) {
                    let y = height1 + (ix - freq1) * (height2 - height1) / (freq2 - freq1);
                    if (y > 255) y = 255;
                    VoiceSynth.tone_adjust[ix] = y;
                }
            }
            freq1 = freq2;
            height1 = height2;
        }

        VoiceSynth.sin_tab = new Float32Array(2048);
        VoiceSynth.freq_tab = new Float32Array(49);
        const n = VoiceSynth.sin_tab.length;
        const f = 2 * Math.PI / n;
        for (let i = 0; i < n; i++) {
            VoiceSynth.sin_tab[i] = -Math.sin(f * i);
        }
        for (let i = 0; i < 49; i++) {
            VoiceSynth.freq_tab[i] = Math.pow(2, i / 48);
        }
    }

    static parse_frac(src) {
        if (src === '' || src === '^') {
            return 1;
        } else {
            let f = (src.charCodeAt(0) - 0x30) * 0.1;
            if (src.length > 1) {
                f += (src.charCodeAt(1) - 0x30) * 0.01;
            }
            return f;
        }
    }
    static copy_obj(o) {
        const p = {};
        for (const k in o) {
            p[k] = o[k];
        }
        return p;
    }
    static parse_pfn(src, pitch, accent, volume) {
        const MILLISEC_T = SAMPLING_RATE / 1000;
        const ret = [];
        const fmt = {};

        for (const k of fmt_keys) {
            fmt[k] = 0;
        }
        let prev_v = 0;
        let total_fwd = 0;
        for (let chunk of src) {
            let fwd = 0;
            let off = 0;
            let sy_len = 1;
            const i_note = chunk.indexOf('|');
            if (i_note >= 0) {
                const note = chunk.substring(0, i_note).trim();
                ret.push({cmd:'chunk', fwd:total_fwd, off:0, val:note});
                chunk = chunk.substring(i_note + 1);
            } else {
                ret.push({cmd:'chunk', fwd:total_fwd, off:0, val:null});
            }
            for (const seg of chunk.split(' ')) {
                if (seg.length === 0) continue;

                const c = seg[0];
                if (c === '=') {
                    sy_len = Number.parseFloat(seg.substring(1));
                } else if (c === '+' || c === '-') {
                    off += (Number.parseInt(seg) * MILLISEC_T) | 0;
                } else if (c >= '0' && c <= '9' || c === '^') {
                    fwd = VoiceSynth.parse_frac(seg);
                    off = 0;
                } else if (seg === '.') {
                    ret.push({cmd: 'A', fwd:total_fwd, off:0, val:0});
                    ret.push({cmd: 'A', fwd:total_fwd + sy_len, off:0, val:0});
                } else if (seg === '!') {
                    const fwd2 = total_fwd + fwd * sy_len;
                    ret.push({cmd: 'v', fwd:fwd2, off:off, val:prev_v});
                    ret.push({cmd:'fmt', fwd:fwd2, off:off, val: VoiceSynth.copy_obj(fmt)});
                } else {
                    let fmt_exist = false;
                    let articulation = false;
                    const fwd2 = total_fwd + fwd * sy_len;

                    for (const m of seg.matchAll(/(\w)(\d*)/g)) {
                        let cmd = m[1];
                        let val;
                        switch (cmd) {
                        case 'P':
                            val = Number.parseInt(m[2]);
                            break;
                        case 'p':
                            val = (pitch + VoiceSynth.parse_frac(m[2]) * accent) | 0;
                            cmd = 'P';
                            break;
                        case 'F':
                            cmd = 'f';
                            val = 1 + VoiceSynth.parse_frac(m[2]);
                            break;
                        case 'g':
                            cmd = 'v';
                            val = 1 + VoiceSynth.parse_frac(m[2]);
                            break;
                        default:
                            val = VoiceSynth.parse_frac(m[2]);
                            break;
                        }
                        if (fmt_keys.indexOf(cmd) >= 0) {
                            if (!fmt_exist) {
                                fmt_exist = true;
                            }
                            if (!articulation && (cmd === 'f' || cmd === 'e' || cmd === 'o')) {
                                for (const k of fmt_keys) {
                                    fmt[k] = 0;
                                }
                                articulation = true;
                            }
                            fmt[cmd] = val;
                            if (cmd === 'f') {
                                fmt.e = val;
                            }
                        } else if (cmd === 'A') {
                            ret.push({cmd:cmd, fwd:fwd2, off:off, val: val * volume});
                        } else if (p_keys.indexOf(cmd) >= 0) {
                            ret.push({cmd:cmd, fwd:fwd2, off:off, val: val});
                            if (cmd === 'v') prev_v = val;
                        } else if (cmd === 'b') {
                            // prev articulation
                            if (!articulation) {
                                for (const k of "Lrancs") {
                                    fmt[k] = 0;
                                }
                                articulation = true;
                            }
                        } else if (cmd === 'B') {
                            // next articulation
                            articulation = true;
                        } else {
                            throw new Error('unknown cmd: ' + cmd);
                        }
                    }
                    if (fmt_exist) {
                        ret.push({cmd:'fmt', fwd:fwd2, off:off, val: VoiceSynth.copy_obj(fmt)});
                    }
                }
            }
            total_fwd += sy_len;
        }
        ret.push({cmd:'chunk', fwd:total_fwd, off:0, val:null});
        return ret;
    }

    static calc_ticks(cmd, ut, init_ticks) {
        const ret = [];
        const prev = {};
        for (let k of p_keys) prev[k] = -1;
        prev.fmt = -1;

        let chunk = null;
        let last_ticks = init_ticks;

        for (const c of cmd) {
            const ticks = init_ticks + ((c.fwd * ut) | 0) + c.off;
            if (c.cmd === 'chunk') {
                if (chunk) {
                    chunk.len = ticks - chunk.ticks;
                }
                chunk = {cmd:'chunk', ticks:ticks, len:0, val:c.val ?? ''};
                ret.push(chunk);
            } else if (c.cmd === 'fmt') {
                const pre = prev.fmt;
                const t2 = pre >= 0 ? pre : last_ticks;
                const len = pre >= 0 ? ticks - t2 : 0;
                if (t2 >= 0) ret.push({cmd:'fmt', ticks:t2, len:len, val:c.val});
                prev.fmt = ticks;
            } else if (c.cmd === 'A') {
                const k = c.cmd;
                const pre = prev[k];
                const t2 = pre >= 0 ? pre : last_ticks;
                const len = pre >= 0 ? ticks - t2 : 0;
                if (len > 0 && t2 >= 0) ret.push({cmd:k, ticks:t2, len:len, val:c.val});
                prev[k] = ticks;
                if (c.val === 0 && pre >= 0) {
                    for (let k of p_keys) prev[k] = -1;
                    prev.fmt = -1;
                    last_ticks = ticks;
                }
            } else {
                const k = c.cmd;
                const pre = prev[k];
                const t2 = pre >= 0 ? pre : last_ticks;
                const len = pre >= 0 ? ticks - t2 : 0;
                if (t2 >= 0) ret.push({cmd:k, ticks:t2, len:len, val:c.val});
                prev[k] = ticks;
            }
        }
        ret.sort(VoiceSynth.#cmd_compare);
        return ret;
    }
    static #cmd_compare(a, b) {
        if (a.ticks !== b.ticks) {
            return a.ticks - b.ticks;
        } else {
            const a1 = a.cmd === 'chunk' ? 0 : a.cmd === 'fmt' ? 2 : 1;
            const b1 = b.cmd === 'chunk' ? 0 : b.cmd === 'fmt' ? 2 : 1;
            return a1 - b1;
        }
    }

    static default_voice() {
        return {
            pitch: 100,
            flutter: 64,
            fricative: 64,
            roughness: 1,
            height: new Int16Array([260,256,240,232,200,200,256]),
            width: new Int16Array([294,256,256,320,342,342,256]),
            freq: new Int16Array([256,256,256,256,256,256,256]),
            freqadd: new Int16Array([0,0,0,0,0,0,0]),
        };
    }

    constructor(vp) {
        const WAVEMUL_FACT = 60;
        const N_LOWHARM = 30;

        this.voice = new Voice(vp);
        this.prm = {};
        for (let c of p_keys) this.prm[c] = new Interpolation(0);

        this.flutter_ix = 0;
        this.amplitude_v = 0;
        this.amplitude_n = 0;
        this.samplecount = 0;
        this.wavephase = 0x7fffffff;
        this.ticks = 0;
        this.wait_count = 0;

        this.fmt = new Formants();
        this.reso_list = new ResonatorSet(5);

        this.peak_harmonic = new Int32Array(N_PEAKS);
        this.peak_height = new Int32Array(N_PEAKS);
        this.harm_inc = new Int32Array(N_LOWHARM);
        this.hspect = [new Int32Array(MAX_HARMONIC), new Int32Array(MAX_HARMONIC)];
        this.harmspect = this.hspect[0];
        this.hswitch = 0;

        this.modn_period = 0;
        this.modn_amp = 0;

        // set up window to generate a spread of harmonics from a
        // single peak for HF peaks
        this.wavemult_max = ((SAMPLING_RATE * WAVEMUL_FACT) / (256 * 50)) | 0;
        if (this.wavemult_max > VoiceSynth.wavemult_tab.length) {
            this.wavemult_max = VoiceSynth.wavemult_tab.length;
        }
        this.wavemult_offset = (this.wavemult_max / 2) | 0;
        this.cmd_list = [{cmd:'chunk', ticks:0, len:0, val:''}];
        this.cmd_list_p = 0;
    }

    set_pfn(src, speed, pitch, accent, volume) {
        this.prm.P.set(0, pitch);
        this.current_pitch = this.#get_current_pitch();

        const cmd = VoiceSynth.parse_pfn(src, pitch, accent, volume);
        const ut = (SAMPLING_RATE * 60 / speed) | 0;
        const cmd2 = VoiceSynth.calc_ticks(cmd, ut, this.cmd_list.at(-1).ticks);
        if (this.cmd_list.length === 1) {
            this.cmd_list = cmd2;
        } else {
            this.cmd_list.splice(this.cmd_list.length - 1, 1);
            this.cmd_list = this.cmd_list.concat(cmd2);
        }
    }

    get_remaining() {
        return this.cmd_list.at(-1).ticks - this.ticks;
    }

    get_chunk_count() {
        let count = 0;
        for (const c of this.cmd_list) {
            if (c.cmd === 'chunk') count++;
        }
        return count - 1;
    }

    generate(buffer) {
        const outbuf = new FloatBuffer(buffer);
        if (this.wait_count > 0) {
            if (this.#gen_wave(outbuf)) {
                return outbuf.idx;
            }
        }

        while (this.cmd_list_p < this.cmd_list.length) {
            const c = this.cmd_list[this.cmd_list_p];
            if (c.ticks > this.ticks) {
                this.wait_count = c.ticks - this.ticks;
                if (this.#gen_wave(outbuf)) {
                    return outbuf.idx;
                }
            }

            switch (c.cmd) {
            case 'chunk':
                // ignore
                break;
            case 'fmt':
                this.fmt.set(this.voice, c.len, c.val);
                this.reso_list.set_vertex(this.fmt, this.voice);
                break;
            case 'P':
                this.prm.P.set(c.len, c.val);
                this.current_pitch = this.#get_current_pitch();
                break;
            default:
                this.prm[c.cmd].set(c.len, c.val);
                break;
            }
            this.cmd_list_p++;
        }
        return outbuf.idx;
    }
    #get_current_pitch() {
        // freq = 2 ^ (P/1200)
        const vP = this.prm.P.val / 25;
        const p = vP | 0;
        const r = vP - p;
        const m = p % 48;
        const f = VoiceSynth.freq_tab[m] * (1 - r) + VoiceSynth.freq_tab[m + 1] * r;
        return (this.voice.pitch * (1 << ((p / 48) | 0)) * f) | 0;
    }
    #gen_wave(outbuf) {
        while (this.wait_count > 0) {
            outbuf.push(this.#play_spect());
            this.ticks++;
            this.wait_count--;
            if (outbuf.is_full()) {
                return true;
            }
        }
        return false;
    }

    #play_spect() {
        const PHASE_INC_FACTOR = (0x8000000 / SAMPLING_RATE) | 0; // assumes pitch is Hz*32

        if ((this.samplecount & (STEPSIZE - 1)) === 0) {
            // every 64 samples, adjust the parameters
            this.#advance_parameters();

            // pitch is Hz<<12
            this.phaseinc = (this.current_pitch >> 7) * PHASE_INC_FACTOR;
            this.cycle_samples = (SAMPLING_RATE / (this.current_pitch >> 12)) | 0; // sr/(pitch*2)
            this.hf_factor = this.current_pitch >> 11;

            this.maxh = this.maxh2;
            this.harmspect = this.hspect[this.hswitch];
            this.hswitch ^= 1;
            this.maxh2 = this.#peaks_to_harmspect(this.fmt.p, this.current_pitch << 4, this.hspect[this.hswitch]);
        } else if ((this.samplecount & 0x07) === 0) {
            for (let h = 1; h < this.harm_inc.length && h <= this.maxh2 && h <= this.maxh; h++) {
                this.harmspect[h] += this.harm_inc[h];
            }
        }

        this.samplecount++;
        this.wavephase += this.phaseinc;
        if (this.wavephase >= 0x80000000) {
            // sign has changed, reached a quiet point in the waveform
            this.cbytes = this.wavemult_offset - ((this.cycle_samples) >> 1);

            for (let pk = N_HARMONIC_PEAKS+1; pk < N_PEAKS; pk++) {
                // find the nearest harmonic for HF peaks where we don't use shape
                this.peak_harmonic[pk] = ((this.fmt.p[pk].freq / (this.current_pitch * 8)) + 1) / 2;
            }
        }
        if (this.wavephase >= 0x80000000) {
            this.wavephase -= 0x100000000;
        }

        let z = 0;
        if (this.amplitude_v > 0) {
            z += this.#play_voice();
        }
        if (this.amplitude_n > 0) {
            z += this.reso_list.get(this.amplitude_n);
        }
        return z;
    }
    #play_voice() {
        const waveph = (this.wavephase >> 16) & 0xFFFF;
        let v = 0;

        // apply HF peaks, formants 6,7,8
        // add a single harmonic and then spread this my multiplying by a
        // window.  This is to reduce the processing power needed to add the
        // higher frequence harmonics.
        this.cbytes++;
        if (this.cbytes >= 0 && this.cbytes < this.wavemult_max) {
            for (let pk = N_HARMONIC_PEAKS + 1; pk < N_PEAKS; pk++) {
                const th = (this.peak_harmonic[pk] * waveph) & 0xFFFF;
                v += VoiceSynth.sin_tab[th >> 5] * this.peak_height[pk];
            }
            // spread the peaks by multiplying by a window
            v = v / this.hf_factor * VoiceSynth.wavemult_tab[this.cbytes];
        }

        // apply main peaks, formants 0 to 5
        let theta = waveph;
        for (let h = 1; h <= this.maxh; h++) {
            const hs = this.harmspect[h];
            v += VoiceSynth.sin_tab[theta >> 5] * hs;
            theta = (theta + waveph) & 0xFFFF;
        }
        return v * this.amplitude_v;
    }

    #advance_parameters() {
        for (let k in this.prm) {
            this.prm[k].next(STEPSIZE);
        }
        this.fmt.next(STEPSIZE);

        this.reso_list.set_peaklist(this.fmt);
        this.reso_list.modify(this.fmt, this.voice);

        const v = this.prm.v.val;
        const c = this.fmt.prm.c;

        // add pitch flutter
        const flutter_fac = this.fmt.prm.v > 1 ? VoiceSynth.flutter_factor[(this.fmt.prm.v * 8) | 0] : 1;
        const pitch_val = this.#get_current_pitch();
        let pitch = pitch_val + (VoiceSynth.flutter_tab[this.flutter_ix] - 0x80) * this.voice.flutter * flutter_fac;
        if (pitch < 51200) pitch = 51200;       // min pitch, 12.5 Hz  (12.5 << 12)
        if (pitch > 25600000) pitch = 25600000; // max pitch, 6250 Hz
        if (v > 1.5) {
            pitch = (pitch * (v - 0.5) * 1.4) | 0;
        }
        this.current_pitch = pitch;
        this.flutter_ix++;
        if (this.flutter_ix >= VoiceSynth.flutter_tab.length) {
            this.flutter_ix = 0;
        }

        // adjust amplitude to compensate for fewer harmonics at higher pitch
        const amp = this.prm.A.val * this.prm.A.val;
        const f = amp * this.current_pitch / 4000;

        // TODO
        this.modn_period = 0;
        if (this.voice.roughness > 0) {
            this.modn_period = VoiceSynth.modulation_tab[this.voice.roughness];
            this.modn_amp = this.modn_period & 0xf;
            this.modn_period = this.modn_period >> 4;
        }

        const vf = v < 0.5 ? v * 2 : v > 1.5 ? (2 - v) * 2 : 1;
        const vn = v < 0.5 ? 1 : v < 1 ? (1 - v) * 2 : 0;
        const vs = c < 0.5 ? c : 1 - c;
        this.amplitude_v = f * vf * vf / 7600000;
        this.amplitude_n = f * (vn + vs * 4) / 10000000 * this.voice.fricative;
    }

    #peaks_to_harmspect(peaks, pitch, htab) {
        const OPTION_HARMONIC = 10;
        // Calculate the amplitude of each  harmonics from the formants
        // Only for formants 0 to 5
        // control 0=initial call, 1=every 64 cycles
        // pitch and freqs are Hz<<16

        // initialise as much of *out as we will need
        let hmax = ((peaks[N_HARMONIC_PEAKS].freq + peaks[N_HARMONIC_PEAKS].right) / pitch) | 0;
        if (hmax >= MAX_HARMONIC) hmax = MAX_HARMONIC - 1;

        // restrict highest harmonic to half the samplerate
        let hmax_samplerate = (((SAMPLING_RATE * 19 / 40) << 16) / pitch) | 0; // only 95% of Nyquist freq
        if (hmax > hmax_samplerate) hmax = hmax_samplerate;

        for (let h = 0; h <= hmax; h++) htab[h] = 0;

        let pk;
        for (pk = 0; pk <= N_HARMONIC_PEAKS; pk++) {
            const p = peaks[pk];
            let fp = p.freq;  // centre freq of peak
            if (p.height === 0 || fp === 0) continue;

            const fhi = p.freq + p.right; // high freq of peak
            let ih = (((p.freq - p.left) / pitch) | 0) + 1;
            if (ih <= 0) ih = 1;

            for (let f = pitch * ih; f < fhi; f += pitch) {
                const i = f < fp ? (fp - f) / (p.left >> 8) : (f - fp) / (p.right >> 8);
                htab[ih++] += VoiceSynth.pk_shape1[i | 0] * p.height;
            }
        }

        // increase bass
        let y = peaks[1].height * 10; // addition as a multiple of 1/256s
        let h2 = ((1000 << 16) / pitch) | 0; // decrease until 1000Hz
        if (h2 > 0) {
            let x = (y / h2) | 0;
            let ih = 1;
            while (y > 0 && ih < htab.length) {
                htab[ih++] += y;
                y -= x;
            }
        }

        // find the nearest harmonic for HF peaks where we don't use shape
        for (; pk < N_PEAKS; pk++) {
            let x = peaks[pk].height >> 14;
            this.peak_height[pk] = (x * x * 5) >> 1;

            // only use harmonics up to half the samplerate
            if (this.peak_harmonic[pk] >= hmax_samplerate) {
                this.peak_height[pk] = 0;
            }
        }

        // convert from the square-rooted values
        let fp = 0;
        for (let h = 0; h <= hmax; h++) {
            const x = htab[h] >> 15;
            htab[h] = (x * x) >> 8;

            let ix = (fp >> 19);
            if (ix < VoiceSynth.tone_adjust.length) {
                htab[h] = (htab[h] * VoiceSynth.tone_adjust[ix]) >> 13; // index tone_adjust with Hz/8
            }
            fp += pitch;
        }

        // adjust the amplitude of the first harmonic, affects tonal quality
        htab[1] = (htab[1] * OPTION_HARMONIC / 8) | 0;

        // calc intermediate increments of LF harmonics
        for (let h = 1; h < this.harm_inc.length; h++) {
            this.harm_inc[h] = (htab[h] - this.harmspect[h]) >> 3;
        }

        return hmax; // highest harmonic number
    }
}
