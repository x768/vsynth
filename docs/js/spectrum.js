const WINDOW_WIDTH = 1024;

export function show_waveform(canvas, buf)
{
    const w = buf.length >> 5;
    const h = 64;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', {alpha:false, willReadFrequently:true});
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);
    if (w <= 0) return;
    const img = ctx.getImageData(0, 0, w, h);

    for (let x = 0; x < buf.length; x += 32) {
        const x2 = x >> 5;
        if (x2 >= w) break;

        let min = 1;
        let max = -1;
        const end = Math.min(x + 32, buf.length);
        for (let x3 = x; x3 < end; x3++) {
            const v = buf[x3];
            if (min > v) min = v;
            if (max < v) max = v;
        }
        const y1 = Math.min(Math.max(((min + 1) * 32) | 0, 0), 64);
        const y2 = Math.min(Math.max(((max + 1) * 32) | 0, 0), 64);
        for (let y = y1; y <= y2; y++) {
            const i = (x2 + y * w) * 4;
            img.data[i    ] = 255;
            img.data[i + 1] = 255;
            img.data[i + 2] = 255;
        }
    }

    ctx.putImageData(img, 0, 0);
}
function fft(b1, tmp, sint)
{
    const n = WINDOW_WIDTH;
    const WINDOW_WIDTH_1 = 1023;
    const n4 = n >> 2;
    let p = n >> 1;
    let m = 2;

    tmp.fill(0);
    while (m <= n) {
        const m2 = m >> 1;
        for (let k = 0; k < n; k += m) {
            for (let j = 0; j < m2; j++) {
                const sin = -sint[(p * j) & WINDOW_WIDTH_1];
                const cos = sint[(p * j + n4) & WINDOW_WIDTH_1];
                const kj2 = (k + j) << 1;
                const km2 = (k + j + m2) << 1;

                tmp[kj2    ] = b1[kj2    ] + cos * b1[km2] - sin * b1[km2 + 1];
                tmp[kj2 + 1] = b1[kj2 + 1] + sin * b1[km2] + cos * b1[km2 + 1];
                tmp[km2    ] = b1[kj2    ] - cos * b1[km2] + sin * b1[km2 + 1];
                tmp[km2 + 1] = b1[kj2 + 1] - sin * b1[km2] - cos * b1[km2 + 1];
            }
            for (let j = 0; j < m; j++) {
                const kj2 = (k + j) << 1;
                b1[kj2    ] = tmp[kj2    ];
                b1[kj2 + 1] = tmp[kj2 + 1];
            }
        }
        m = m << 1;
        p = p >> 1;
    }
}
export function show_spectrum(canvas, buf)
{
    function create_window(len) {
        const a = new Float32Array(len);
        for (let i = 0; i < len; i++) {
            a[i] = 0.5 - Math.cos(i * 2 * Math.PI / len) * 0.5;
        }
        return a;
    }
    function apply_window(tmp, buf, w, x) {
        const offset = x < 0 ? -x : 0;
        for (let i = 0; i < offset; i++) {
            tmp[i] = 0;
        }
        for (let i = offset; i < w.length; i++) {
            tmp[i] = w[i] * buf[x + i];
        }
    }
    function sin_table(n) {
        const a = new Float32Array(n);
        const th = 2 * Math.PI / n;
        for (let i = 0; i < n; i++) {
            a[i] = Math.sin(th * i);
        }
        return a;
    }

    const rev = new Uint8Array([0,16,8,24,4,20,12,28,2,18,10,26,6,22,14,30,1,17,9,25,5,21,13,29,3,19,11,27,7,23,15,31]);
    const window = create_window(WINDOW_WIDTH);
    const src = new Float32Array(WINDOW_WIDTH);
    const tmp = new Float32Array(WINDOW_WIDTH * 2);
    const b1 = new Float32Array(WINDOW_WIDTH * 2);

    const sint = sin_table(WINDOW_WIDTH);
    const w = buf.length >> 5;
    const h = canvas.height;
    canvas.width = w;
    const ctx = canvas.getContext('2d', {alpha: false, willReadFrequently:true});
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);
    if (w <= 0) return;
    const img = ctx.getImageData(0, 0, w, h);

    for (let x = 0; x < buf.length; x += 32) {
        apply_window(src, buf, window, x - WINDOW_WIDTH);
        b1.fill(0);
        for (let i = 0; i < WINDOW_WIDTH; i++) {
            const j = (rev[i & 0x1f] << 5) | rev[i >> 5];
            b1[i << 1] = src[j];
        }
        fft(b1, tmp, sint);
        const x2 = x >> 5;
        for (let y = 0; y < h; y++) {
            const v0 = b1[y * 2];
            const v1 = b1[y * 2 + 1];
            const y0 = h - y - 1;
            const v = (Math.log(v0 * v0 + v1 * v1 + 0.000001) * 30 + 60) | 0;
            const i = (x2 + y0 * w) << 2;
            const v2 = v * 2;
            img.data[i + 0] = v2;
            img.data[i + 1] = v2 - 128;
            img.data[i + 2] = 0;
        }
    }
    ctx.putImageData(img, 0, 0);
}
