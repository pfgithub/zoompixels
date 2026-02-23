type Sub = [Pixel, Pixel, Pixel, Pixel];
const cache = new Map<string, Sub>();
const cycle = [0.9, 0.8, 0.7, 0.6];
// for perf, instead of bigint, we could provide the path to get here. so getPixels doesn't need to call getPixels on the parent.
// and so we don't need huge bigints; instead, numbers are all relative to the current level
// that's a good idea.
function getPixels(x: bigint, y: bigint, zoom: number): Sub {
    const cachename = `${x},${y},${zoom}`;
    const pv = cache.get(cachename);
    if(pv != null) return pv;
    if(zoom < 0) throw new Error("todo zoom out");
    if(x < 0 || y < 0) {
        // because there's no @divFloor for bigint
        const rv: Sub = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
        cache.set(cachename, rv);
        return rv;
    }
    if (zoom === 0) {
        const rv: Sub = [[128, 128, 128], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
        cache.set(cachename, rv);
        return rv;
    }
    const parent = getPixels(x / 2n, y / 2n, zoom - 1);
    const xm = Number(x & 0b1n);
    const ym = Number(y & 0b1n);
    const color = parent[(ym << 1) | xm];
    const rv: Sub = getSub(color, cycle[zoom % cycle.length]);
    cache.set(cachename, rv);
    return rv;
}
globalThis.getPixels = getPixels;

type Pixel = [number, number, number];
function getSubOne2(parent: number): [number, number, number, number] {
    // random but average is equal to parent
    const [a, b, c, d] = [Math.random(), Math.random(), Math.random(), Math.random()];
    const avg = (a + b + c + d) / 4;
    const factor = parent / avg;
    return [a * factor, b * factor, c * factor, d * factor];
}
function getSubOne(n, m) {
    return generateControlledRandomNumbers(n, m);
}
function generateControlledRandomNumbers(n, tightness) {
    n /= 255;
  const count = 4;
  const targetSum = n * count;
  let currentSum = targetSum;
  const rawRandoms = [];

  // 2. Generate Base Random Numbers (Tightness = 0 scenario)
  // We use the same look-ahead logic to ensure the random set is valid.
  for (let i = 0; i < count - 1; i++) {
    const remainingSlots = count - (i + 1);
    
    // Calculate safe bounds to ensure future numbers can still sum to total
    const min = Math.max(0, currentSum - remainingSlots);
    const max = Math.min(1, currentSum);

    const val = Math.random() * (max - min) + min;
    
    rawRandoms.push(val);
    currentSum -= val;
  }
  
  // Add the final remainder, clamped to 0-1 to fix floating point dust
  rawRandoms.push(Math.max(0, Math.min(1, currentSum)));

  // 3. Apply Tightness (Interpolation)
  // Formula: Result = Target + (Random - Target) * (1 - tightness)
  // If tightness is 1, we get Target. If 0, we get Random.
  const varianceFactor = 1 - tightness;
  
  const results = rawRandoms.map(r => {
    return (n + (r - n) * varianceFactor) * 255;
  });

  // 4. Shuffle to remove generation bias
  return shuffleArray(results);
}

// Helper: Fisher-Yates Shuffle
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


function getSub(parent: Pixel, m: number): [Pixel, Pixel, Pixel, Pixel] {
    const [a0, b0, c0, d0] = getSubOne(parent[0], m);
    const [a1, b1, c1, d1] = getSubOne(parent[1], m);
    const [a2, b2, c2, d2] = getSubOne(parent[2], m);
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

let state_shift_x = 0n; 
let state_shift_y = 0n;

let state_zoom = 0;
let state_rez = 8;
let cached_image: ImageData | null = null;
let cached_image_key: string | null = null;
function updImage() {
    const key = `${state_zoom},${state_rez},${state_shift_x}${state_shift_y}`;
    if(key === cached_image_key) return cached_image!;
    const w = 2**state_rez;
    const h = 2**state_rez;
    const z = state_zoom + state_rez;
    const ofs_x = state_shift_x;
    const ofs_y = state_shift_y;
    const raw = new Uint8ClampedArray(w * h * 4);
    for(let x = 0; x < w; x += 2) {
        for(let y = 0; y < h; y += 2) {
            const pixels = getPixels(ofs_x + BigInt(x / 2), ofs_y + BigInt(y / 2), z);
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
    cached_image_key = key;
    cached_image = new ImageData(raw, w, h);
    return cached_image!;
    
}
function upd2() {
    const img = updImage();
    canvasel.width = img.width;
    canvasel.height = img.height;

    ctx.putImageData(img, 0, 0);
}

canvasholderel.appendChild(canvasel);

// Replace the quadrant buttons with canvas click handling
canvasel.style.cursor = 'pointer';

// Remove the old buttons code and replace with a single reset button if desired
const resetBtn = document.createElement("button");
resetBtn.textContent = "Reset";
resetBtn.onclick = () => {
    state_zoom = 0;
    state_shift_x = 0n; 
    state_shift_y = 0n;
    upd2();
};
document.body.appendChild(resetBtn);

const zoom_out_btn = document.createElement("button");
zoom_out_btn.textContent = "Zoom Out";
zoom_out_btn.onclick = () => {
    if(state_zoom == 0) return; // min
    state_zoom -= 1;
    state_shift_x /= 2n;
    state_shift_y /= 2n;
    upd2();
};
document.body.appendChild(zoom_out_btn);

for(const quad of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
    const zoom_in_btn = document.createElement("button");
    zoom_in_btn.textContent = "Zoom "+quad.join(",");
    zoom_in_btn.onclick = () => {
        state_zoom += 1;
        state_shift_x *= 2n;
        state_shift_y *= 2n;
        upd2();
    };
    document.body.appendChild(zoom_in_btn);
}

const incr_rez_btn = document.createElement("button");
incr_rez_btn.textContent = "++";
incr_rez_btn.onclick = () => {
    state_rez += 1;
    state_shift_x *= 2n;
    state_shift_y *= 2n;
    upd2();
};
document.body.appendChild(incr_rez_btn);
const decr_rez_btn = document.createElement("button");
decr_rez_btn.textContent = "--";
decr_rez_btn.onclick = () => {
    if(state_rez == 1) return;
    state_rez -= 1;
    state_shift_x /= 2n;
    state_shift_y /= 2n;
    upd2();
};
document.body.appendChild(decr_rez_btn);

upd2();

// Add drag functionality to move the canvas around
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let didMove = false;

let mpos_x = 0;
let mpos_y = 0;

canvasel.addEventListener("wheel", (e) => {
    e.preventDefault();
    e.stopPropagation();
    mpos_x = e.clientX;
    mpos_y = e.clientY;
    const canvas_pos = canvasel.getBoundingClientRect();
    const x = (mpos_x - canvas_pos.left) / canvas_pos.width * (2**(state_rez - 1));
    const y = (mpos_y - canvas_pos.top) / canvas_pos.height * (2**(state_rez - 1));
    const tgt_x = state_shift_x + BigInt(x | 0);
    const tgt_y = state_shift_y + BigInt(y | 0);

    console.log(x, y, tgt_x, tgt_y, state_shift_x, state_shift_y);
    state_shift_x = tgt_x;
    state_shift_y = tgt_y;
    if(e.deltaY < 0) {
        state_zoom += 1;
        state_shift_x *= 2n;
        state_shift_y *= 2n;
    }else if(state_zoom > 0) {
        state_zoom -= 1;
        state_shift_x /= 2n;
        state_shift_y /= 2n;
    } else {
        // min zoom
    }
    state_shift_x -= BigInt(x |0);
    state_shift_y -= BigInt(y |0);
    upd2();

    return false;
}, false);

canvasel.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    didMove = false;
});

window.addEventListener('mousemove', (e) => {
    mpos_x = e.clientX;
    mpos_y = e.clientY;
    if (isDragging) {
        const state_shift_scl = 2**(-state_rez+Math.log2(display_w)+1);
        while(e.clientX - lastMouseX >= state_shift_scl) {
            lastMouseX += state_shift_scl;
            state_shift_x -= 1n;
            didMove = true;
        }
        while(e.clientY - lastMouseY >= state_shift_scl) {
            lastMouseY += state_shift_scl;
            state_shift_y -= 1n;
            didMove = true;
        }
        while(e.clientX - lastMouseX <= -state_shift_scl) {
            lastMouseX -= state_shift_scl;
            state_shift_x += 1n;
            didMove = true;
        }
        while(e.clientY - lastMouseY <= -state_shift_scl) {
            lastMouseY -= state_shift_scl;
            state_shift_y += 1n;
            didMove = true;
        }
        
        // Update the display
        upd2();
    }
});

window.addEventListener('mouseup', (e) => {
    isDragging = false;
});

window.addEventListener('mouseleave', () => {
    isDragging = false;
});