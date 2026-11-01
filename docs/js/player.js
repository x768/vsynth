import { Compressor } from '../lib/misc.js';

export class WavPlayer
{
    /**
     * Sound player 16bit monoral only
     * @param {number} sample_rate in Hz, 24000 or 48000 are recommended
     * @param {number} gain 
     * @param {number} limit 0 ... 1
     */
    constructor(sample_rate, gain, limit) {
        this.sample_rate = sample_rate;
        this.gain = gain;
        this.limit = limit;
        this.ctx = null;
        this.source = null;
        this.next = null;
        this.start_time = 0;
        this.next_time = 0;
    }

    get_ticks() {
        if (!this.ctx) this.ctx = new AudioContext();
        return ((this.ctx.currentTime - this.start_time) * this.sample_rate) | 0;
    }
    /**
     * 
     * @param {Float32Array} src audio buffer
     * @returns {Promise<void>} wait until the sound stops.
     */
    async play(src) {
        if (!this.ctx) this.ctx = new AudioContext();
        const { promise, resolve } = Promise.withResolvers();

        await this.ctx.suspend();
        this.source = this.#new_src(src, () => {
            this.source = null;
            resolve();
        });
        this.start_time = this.ctx.currentTime;
        await this.ctx.resume();
        this.source.start();

        return await promise;
    }
    /**
     * 
     * @param {() => Float32Array} on_request returns next audio buffer or null if it terminates.
     * @returns {Promise<void>} wait until the sound stops.
     */
    async play_seq(on_request) {
        if (!this.ctx) this.ctx = new AudioContext();
        const { promise, resolve } = Promise.withResolvers();

        await this.ctx.suspend();
        const src1 = on_request();
        const src2 = on_request();
        this.start_time = this.ctx.currentTime;
        this.next_time = this.start_time + src1.length / this.sample_rate;
        this.source = this.#new_src(src1, () => this.#next_buf(on_request, resolve));
        if (src2) {
            this.next = this.#new_src(src2, () => this.#next_buf(on_request, resolve));
        } else {
            this.next = null;
        }

        await this.ctx.resume();
        this.source.start();
        if (this.next) {
            this.next.start(this.next_time);
            this.next_time += src2.length / this.sample_rate;
        }
        return await promise;
    }

    #new_src(src, on_ended) {
        const buf = this.ctx.createBuffer(1, src.length, this.sample_rate);
        const array = buf.getChannelData(0);
        const c = new Compressor(this.gain, this.limit);
        c.process(array, src);

        const source = this.ctx.createBufferSource();
        source.buffer = buf;
        source.connect(this.ctx.destination);
        source.addEventListener('ended', () => on_ended());
        return source;
    }
    #next_buf(on_request, resolve) {
        const src = on_request();
        this.source = this.next;
        if (!this.source) {
            resolve();
        } else if (src && src.length > 0) {
            this.next = this.#new_src(src, () => this.#next_buf(on_request, resolve));
            this.next.start(this.next_time);
            this.next_time += src.length / this.sample_rate;
        } else {
            this.next = null;
        }
    }

    /**
     * stop playing sound immediately
     */
    stop() {
        if (this.source) {
            this.source.stop();
            this.source = null;
        }
        if (this.next) {
            this.next.stop();
            this.next = null;
        }
    }
}
