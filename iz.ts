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

const display_w = 512;
const display_h = 512;

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

function upd() {
    ensureDivided();
    const raw = new Uint8ClampedArray(img.data);
    canvasel.width = img.w;
    canvasel.height = img.h;
    const data = new ImageData(raw, img.w, img.h);

    ctx.putImageData(data, 0, 0);
}

const zmbtn = document.createElement("button");
zmbtn.textContent = "zoom";
zmbtn.onclick = () => {
    zoomAnim();
    upd();
};

function zoomAnim() {
    const anim = canvasel.animate([
        {transform: "scale(1)"},
        {transform: "scale(2)"},
    ], {
        duration: 500,
        fill: "both",
    });
    anim.finished.then(() => {
        zoom();
        anim.cancel();
        upd();
    });
}
function zoom() {
    const old = img.data;
    const old_w = img.w;
    const old_h = img.h;
    const new_w = old_w / 2;
    const new_h = old_h / 2;
    const final = new Float64Array(new_w * new_h * 4);
    const offset_x = new_w / 2;
    const offset_y = new_h / 2;
    final.fill(255);
    for(let new_y = 0; new_y < old_w; new_y += 1) {
        for(let new_x = 0; new_x < old_h; new_x += 1) {
            const old_y = new_y + offset_y;
            const old_x = new_x + offset_x;
            final[(new_y * new_w + new_x) * 4 + 0] = old[(old_y * old_w + old_x) * 4 + 0];
            final[(new_y * new_w + new_x) * 4 + 1] = old[(old_y * old_w + old_x) * 4 + 1];
            final[(new_y * new_w + new_x) * 4 + 2] = old[(old_y * old_w + old_x) * 4 + 2];
        }
    }
    img = {
        w: new_w,
        h: new_h,
        data: final,
    };
}

function subdivide() {
    const old = img.data;
    const old_w = img.w;
    const old_h = img.h;
    const new_w = old_w * 2;
    const new_h = old_h * 2;
    const final = new Float64Array(new_w * new_h * 4);
    final.fill(255);
    for(let old_y = 0; old_y < old_w; old_y += 1) {
        for(let old_x = 0; old_x < old_h; old_x += 1) {
            const i = ((old_y * old_w) + old_x) * 4;
            const new_x = old_x * 2;
            const new_y = old_y * 2;
            const [ul, ur, bl, br] = getSub([old[i], old[i + 1], old[i + 2]]);
            final[((new_y + 0) * new_w + (new_x + 0)) * 4 + 0] = ul[0];
            final[((new_y + 0) * new_w + (new_x + 0)) * 4 + 1] = ul[1];
            final[((new_y + 0) * new_w + (new_x + 0)) * 4 + 2] = ul[2];
            final[((new_y + 0) * new_w + (new_x + 1)) * 4 + 0] = ur[0];
            final[((new_y + 0) * new_w + (new_x + 1)) * 4 + 1] = ur[1];
            final[((new_y + 0) * new_w + (new_x + 1)) * 4 + 2] = ur[2];
            final[((new_y + 1) * new_w + (new_x + 0)) * 4 + 0] = bl[0];
            final[((new_y + 1) * new_w + (new_x + 0)) * 4 + 1] = bl[1];
            final[((new_y + 1) * new_w + (new_x + 0)) * 4 + 2] = bl[2];
            final[((new_y + 1) * new_w + (new_x + 1)) * 4 + 0] = br[0];
            final[((new_y + 1) * new_w + (new_x + 1)) * 4 + 1] = br[1];
            final[((new_y + 1) * new_w + (new_x + 1)) * 4 + 2] = br[2];
        }
    }
    img = {
        w: new_w,
        h: new_h,
        data: final,
    };
}

function ensureDivided() {
    while(img.w < display_w) {
        subdivide();
    }
}

upd();

canvasholderel.appendChild(canvasel);
document.body.appendChild(zmbtn);
