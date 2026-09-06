export class Compressor
{
    constructor(gain, limit) {
        this.gain = gain;
        this.limit = limit;
        this.mul = 1;
    }
    process(dst, src) {
        const len = Math.min(dst.length, src.length);
        for (let i = 0; i < len; i++) {
            const v1 = src[i] * this.gain;
            const v2 = v1 * this.mul;
            if (v2 > this.limit) {
                this.mul = this.limit / v1;
            } else if (v2 < -this.limit) {
                this.mul = this.limit / -v1;
            } else if (this.mul < 1) {
                this.mul += 0.001;
                if (this.mul > 1) this.mul = 1;
            }
            dst[i] = v1 * this.mul;
        }
    }
}

export class WavFile
{
    constructor(sample_rate, gain, limit) {
        this.sample_rate = sample_rate;
        this.compressor = new Compressor(gain, limit);
    }
    static set_str(buf, offset, str) {
        for (let i = 0; i < str.length; i++) {
            buf[offset + i] = str.charCodeAt(i);
        }
    }
    static set_i16(buf, offset, v) {
        buf[offset] = v & 0xff;
        buf[offset + 1] = v >> 8;
    }
    static set_i32(buf, offset, v) {
        for (let i = 0; i < 4; i++) {
            buf[offset + i] = (v >> (i * 8)) & 0xff;
        }
    }
    create(list) {
        const total = list.reduce((a, b) => a + b.length, 0);

        const buf = new Uint8Array(44 + total * 2);
        WavFile.set_str(buf, 0, 'RIFF');
        WavFile.set_i32(buf, 4, total * 2 + 36);
        WavFile.set_str(buf, 8, 'WAVEfmt ');
        WavFile.set_i32(buf, 16, 16);       // sizeof fmt
        WavFile.set_i16(buf, 20, 1);        // PCM
        WavFile.set_i16(buf, 22, 1);        // channels
        WavFile.set_i32(buf, 24, this.sample_rate);
        WavFile.set_i32(buf, 28, this.sample_rate * 2);
        WavFile.set_i16(buf, 32, 2);        // bytes/block
        WavFile.set_i16(buf, 34, 16);       // bits/sample
        WavFile.set_str(buf, 36, 'data');
        WavFile.set_i32(buf, 40, total * 2);

        let offset = 44;
        for (const b of list) {
            this.compressor.process(b, b);
            for (let i = 0; i < b.length; i++) {
                const v = (b[i] * 32767) | 0;
                buf[offset++] = v & 0xFF;
                buf[offset++] = (v >> 8) & 0xFF;
            }
        }

        return buf;
    }
}
