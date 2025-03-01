type Sub = [Pixel, Pixel, Pixel, Pixel];
const cache = new Map<string, Sub>();
function getPixels(x: number, y: number, zoom: number): Sub {
    const cachename = `${x},${y},${zoom}`;
    const pv = cache.get(cachename);
    if(pv != null) return pv;
    if(zoom < 0) throw new Error("oob");
    if(zoom == 0) {
        if(x == 0 && y == 0) {
            const rv: Sub = [[255, 255, 255], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
            cache.set(cachename, rv);
            return rv;
        }
        const rv: Sub = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
        cache.set(cachename, rv);
        return rv;
    }
    const parent = getPixels((x / 2) |0, (y / 2) |0, zoom - 1);
    const xm = x & 0b1;
    const ym = y & 0b1;
    const rv: Sub = getSub(parent[(ym << 1) | xm]);
    cache.set(cachename, rv);
    return rv;
}
globalThis.getPixels = getPixels;

type Pixel = [number, number, number];
function getSubOne(parent: number): [number, number, number, number] {
    // random but average is equal to parent
    const [a, b, c, d] = [Math.random(), Math.random(), Math.random(), Math.random()];
    const avg = (a + b + c + d) / 4;
    const factor = parent / avg;
    return [a * factor, b * factor, c * factor, d * factor];
}
function getSub(parent: Pixel): [Pixel, Pixel, Pixel, Pixel] {
    const [a0, b0, c0, d0] = getSubOne(parent[0]);
    const [a1, b1, c1, d1] = getSubOne(parent[1]);
    const [a2, b2, c2, d2] = getSubOne(parent[2]);
    return [
        [a0, a1, a2],
        [b0, b1, b2],
        [c0, c1, c2],
        [d0, d1, d2],
    ];
}

const display_w = 256;
const display_h = 256;

let img: {w: number, h: number, data: Float64Array} = {
    w: 1,
    h: 1,
    data: new Float64Array([255, 255, 255, 255]),
};

const canvasel = document.createElement("canvas");
const canvasholderel = document.getElementById("canvasholder")!;
canvasholderel.style.width = display_w + "px";
canvasholderel.style.height = display_h + "px";
const ctx = canvasel.getContext("2d")!;

let state_x = 0;
let state_y = 0;
let state_zoom = 1;
let state_rez = 8;
function zoom2(px, py) {
    state_x *= 2;
    state_y *= 2;
    state_zoom += 1;
    if(px >= 0.5) state_x += 1;
    if(py >= 0.5) state_y += 1;
    upd2();
}
function upd2() {
    const w = 2**state_rez;
    const h = 2**state_rez;
    const z = state_zoom + state_rez;
    let ofs_x = state_x;
    let ofs_y = state_y;
    let rz = state_rez;
    while(rz > 1) {
        rz -= 1;
        ofs_x *= 2;
        ofs_y *= 2;
    }
    console.log(w, h, z);
    const raw = new Uint8ClampedArray(w * h * 4);
    for(let x = 0; x < w; x += 2) {
        for(let y = 0; y < h; y += 2) {
            const pixels = getPixels(ofs_x + (x / 2), ofs_y + (y / 2), z);
            raw[((y + 0) * w + (x + 0)) * 4 + 0] = pixels[0][0];
            raw[((y + 0) * w + (x + 0)) * 4 + 1] = pixels[0][1];
            raw[((y + 0) * w + (x + 0)) * 4 + 2] = pixels[0][2];
            raw[((y + 0) * w + (x + 0)) * 4 + 3] = 255;
            raw[((y + 0) * w + (x + 1)) * 4 + 0] = pixels[1][0];
            raw[((y + 0) * w + (x + 1)) * 4 + 1] = pixels[1][1];
            raw[((y + 0) * w + (x + 1)) * 4 + 2] = pixels[1][2];
            raw[((y + 0) * w + (x + 1)) * 4 + 3] = 255;
            raw[((y + 1) * w + (x + 0)) * 4 + 0] = pixels[2][0];
            raw[((y + 1) * w + (x + 0)) * 4 + 1] = pixels[2][1];
            raw[((y + 1) * w + (x + 0)) * 4 + 2] = pixels[2][2];
            raw[((y + 1) * w + (x + 0)) * 4 + 3] = 255;
            raw[((y + 1) * w + (x + 1)) * 4 + 0] = pixels[3][0];
            raw[((y + 1) * w + (x + 1)) * 4 + 1] = pixels[3][1];
            raw[((y + 1) * w + (x + 1)) * 4 + 2] = pixels[3][2];
            raw[((y + 1) * w + (x + 1)) * 4 + 3] = 255;
        }
    }
    canvasel.width = w;
    canvasel.height = h;
    const data = new ImageData(raw, w, h);

    ctx.putImageData(data, 0, 0);
}

canvasholderel.appendChild(canvasel);

// Replace the quadrant buttons with canvas click handling
canvasel.style.cursor = 'pointer';
canvasel.onclick = (e) => {
    const rect = canvasel.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    zoom2(x / rect.width, y / rect.height);
};

// Remove the old buttons code and replace with a single reset button if desired
const resetBtn = document.createElement("button");
resetBtn.textContent = "Reset";
resetBtn.onclick = () => {
    state_x = 0;
    state_y = 0;
    state_zoom = 1;
    upd2();
};
document.body.appendChild(resetBtn);

const incr_rez_btn = document.createElement("button");
incr_rez_btn.textContent = "++";
incr_rez_btn.onclick = () => {
    state_rez += 1;
    upd2();
};
document.body.appendChild(incr_rez_btn);
const decr_rez_btn = document.createElement("button");
decr_rez_btn.textContent = "--";
decr_rez_btn.onclick = () => {
    if(state_rez == 1) return;
    state_rez -= 1;
    upd2();
};
document.body.appendChild(decr_rez_btn);

upd2();